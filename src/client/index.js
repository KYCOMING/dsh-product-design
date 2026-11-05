import { registerProductDesignCards, setCanvasOpener } from './cards.js';
import { NS, PANEL_ID } from './constants.js';
import { activeLocale, DICT, pickDict, setAppCtx } from './i18n.js';
import { ProductDesignPanel } from './panel.js';
import { h } from './react.js';
import { setSessionSource, useSessionId } from './session.js';
import { HeroDesignEntry } from './ui/heroEntry.js';

export const inject = ['slots', 'layout'];

// Filled by apply(); module-level component identities stay stable across
// renders (defining components inside apply would remount the whole editor).
let openFullScreen = () => {};
let backToConversation = () => {};
// The hero button can open the canvas before the Session adapter is readable.
let pendingSessionId = '';

function ProductDesignView(props) {
  return h(ProductDesignPanel, {
    sessionId: props && props.sessionId,
    embedded: true,
    onExpand: () => openFullScreen(),
  });
}

function ProductDesignMain() {
  const adapterSessionId = useSessionId();
  if (adapterSessionId) pendingSessionId = '';
  return h(ProductDesignPanel, {
    sessionId: adapterSessionId || pendingSessionId,
    onCollapse: () => backToConversation(),
  });
}

export function apply(ctx) {
  setAppCtx(ctx);
  const bindSession = (scope) => {
    try {
      const service = (scope && scope.get && scope.get('uiSession')) || ctx.get('uiSession');
      if (service && service.adapter) setSessionSource(service.adapter);
    } catch {
      /* uiSession unavailable */
    }
  };
  bindSession(ctx);
  if (typeof ctx.inject === 'function') ctx.inject(['uiSession'], bindSession);

  const layoutService = () => {
    try {
      return ctx.get('layout');
    } catch {
      return null;
    }
  };
  const selectPanel = (id) => {
    const layout = layoutService();
    if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(id);
  };
  openFullScreen = () => selectPanel(PANEL_ID);
  backToConversation = () => selectPanel(null);
  setCanvasOpener(openFullScreen);

  let loc = null;
  try {
    loc = ctx.get('locale');
  } catch {
    loc = null;
  }
  if (loc && typeof loc.register === 'function') {
    ctx.effect(() => {
      const disposes = [];
      try {
        disposes.push(loc.register(NS, 'zh', DICT.zh));
      } catch {
        /* occupied */
      }
      try {
        disposes.push(loc.register(NS, 'en', DICT.en));
      } catch {
        /* occupied */
      }
      return () => {
        for (const d of disposes) {
          try {
            d();
          } catch {
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
    slots.inject('conversation.view', () =>
      slots.register(
        {
          name: 'conversation.view',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => pickDict(activeLocale(), 'entry.label'),
          inject: (sessionId) => ({ sessionId }),
        },
        ProductDesignView,
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
        ProductDesignMain,
      ),
    ),
  );

  disposers.push(
    slots.inject('conversation.hero.options', () =>
      slots.register(
        {
          name: 'conversation.hero.options',
          id: 'dsh-product-design.hero',
          order: 10,
          locale: NS,
          inject: (sessionId) => ({
            sessionId,
            open: () => {
              pendingSessionId = sessionId || '';
              openFullScreen();
            },
          }),
        },
        HeroDesignEntry,
      ),
    ),
  );

  return () => {
    for (const d of disposers.splice(0)) {
      try {
        d();
      } catch {
        /* ignore */
      }
    }
  };
}
