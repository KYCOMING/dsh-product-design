import { registerProductDesignCards, setCanvasOpener } from './cards.js';
import { NS, PANEL_ID } from './constants.js';
import { activeLocale, DICT, pickDict, setAppCtx } from './i18n.js';
import { ProductDesignIcon } from './icons.js';
import { ProductDesignPanel } from './panel.js';

export const inject = ['slots', 'layout'];

export function apply(ctx) {
  setAppCtx(ctx);
  setCanvasOpener(() => {
    try {
      const layout = ctx.get('layout');
      if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID);
    } catch (e) {
      /* layout service unavailable */
    }
  });

  let loc = null;
  try {
    loc = ctx.get('locale');
  } catch (e) {
    loc = null;
  }
  if (loc && typeof loc.register === 'function') {
    ctx.effect(() => {
      const disposes = [];
      try {
        disposes.push(loc.register(NS, 'zh', DICT.zh));
      } catch (e) {
        /* occupied */
      }
      try {
        disposes.push(loc.register(NS, 'en', DICT.en));
      } catch (e) {
        /* occupied */
      }
      return () => {
        for (const d of disposes) {
          try {
            d();
          } catch (e) {
            /* ignore */
          }
        }
      };
    });
  }

  const slots = ctx.slots;
  const disposers = [];
  disposers.push(registerProductDesignCards(ctx));

  disposers.push(
    slots.inject('sidebar.panellist', () =>
      slots.register(
        {
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 30,
          label: () => pickDict(activeLocale(), 'entry.label'),
        },
        ProductDesignIcon,
      ),
    ),
  );

  disposers.push(
    slots.inject('main', () =>
      slots.register(
        {
          name: 'main',
          key: PANEL_ID,
        },
        ProductDesignPanel,
      ),
    ),
  );

  return () => {
    for (const d of disposers.splice(0)) {
      try {
        d();
      } catch (e) {
        /* ignore */
      }
    }
  };
}
