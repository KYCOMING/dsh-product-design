/**
 * Inline "product design" cards, Codex-Visualize style.
 *
 * The Host attaches a `presentationMeta` descriptor to every successful
 * `product_design_apply` result. This module folds those descriptors into the
 * turn and renders a compact preview of the resulting page under the turn's
 * final answer (the `conversation.chat.turnTail` seat), so the user sees the
 * product without opening the full canvas panel.
 */

import { isContainerType } from '../shared/elements.js';
import { defaultState } from './constants.js';
import { useT } from './i18n.js';
import { h } from './react.js';
import { renderWidget } from './widgets.js';

const PRODUCT_DESIGN_META_KIND = 'product-design';
const PRODUCT_DESIGN_TURN_KEY = 'product-design';

let canvasOpener = () => {};

/** Wire the "open canvas" action used by cards; called from the plugin entry. */
export function setCanvasOpener(fn) {
  canvasOpener = typeof fn === 'function' ? fn : () => {};
}

function openCanvas() {
  try {
    canvasOpener();
  } catch {
    /* the layout service may be absent in a non-Web host */
  }
}

/** Narrow persisted tool-result meta to the product-design preview descriptor. */
export function productDesignMetaFrom(meta) {
  if (!meta || typeof meta !== 'object' || meta.kind !== PRODUCT_DESIGN_META_KIND) return null;
  if (!meta.page || typeof meta.page !== 'object' || !meta.page.frame) return null;
  return meta;
}

function resultMeta(data) {
  return data && data.message && data.message.isError === true
    ? null
    : productDesignMetaFrom(data && data.meta);
}

/** Fold one card into the turn's list, replacing a previous card for the same page. */
export function foldCard(cards, card) {
  if (cards.some((existing) => existing.callId === card.callId)) return cards;
  const index = cards.findIndex((existing) => existing.meta.pageId === card.meta.pageId);
  if (index === -1) return [...cards, card];
  return cards.map((existing, at) => (at === index ? card : existing));
}

/** Conversation event definition that collects apply results for each turn. */
export const turnCardsDefinition = {
  kind: PRODUCT_DESIGN_TURN_KEY,
  match: (event) => {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' };
    if (event.type !== 'tool/result') return null;
    return resultMeta(event.data) ? { id: String(event.data.turn), role: 'update' } : null;
  },
  start: (_context, match) => {
    if (match.event.type !== 'turn/start') return null;
    return { turn: match.event.data.turn, cards: [] };
  },
  update: (context, match) => {
    if (match.event.type !== 'tool/result') return context.state;
    const data = match.event.data;
    const meta = resultMeta(data);
    if (!meta) return context.state;
    const cards = foldCard(context.state.cards, {
      callId: String(data.message.source.callId),
      seq: match.event.seq,
      meta,
    });
    return cards === context.state.cards ? context.state : { ...context.state, cards };
  },
  buildLocationData: (context, scope, previous) => {
    if (scope !== 'turn' || context.state === undefined) return null;
    const { turn, cards } = context.state;
    if (
      previous &&
      previous.kind === 'turn' &&
      previous.turn === turn &&
      previous.key === PRODUCT_DESIGN_TURN_KEY &&
      previous.value.cards === cards
    )
      return previous;
    return { kind: 'turn', turn, key: PRODUCT_DESIGN_TURN_KEY, value: { cards } };
  },
};

/** Cards accumulated before the closing assistant message of a turn. */
function cardsBefore(turn, seq) {
  const cards = (turn && turn.data && turn.data.get(PRODUCT_DESIGN_TURN_KEY)?.cards) || [];
  return cards.filter((card) => card.seq < seq);
}

/** Chain selector compatible with the turn-tail slot's older shape. */
function selectTurnCards(owner) {
  if (!owner) return null;
  const cards = cardsBefore(owner.turn, owner.seq);
  return cards.length ? cards : null;
}

function renderMiniElements(elements, t) {
  return (elements || []).map((el) => {
    if (el.hidden) return null;
    const isBox = isContainerType(el.type);
    const style = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.w,
      height: el.h,
      boxSizing: 'border-box',
      opacity: el.opacity == null ? 1 : el.opacity,
    };
    if (isBox && el.type === 'container') {
      style.background = (el.props && el.props.background) || '#ffffff';
      style.borderRadius = el.props && el.props.radius != null ? el.props.radius : 12;
      style.overflow = el.props && el.props.clipContent === false ? 'visible' : 'hidden';
    }
    return h(
      'div',
      { key: el.id, style },
      isBox
        ? renderMiniElements(el.children, t)
        : h(
            'div',
            { style: { width: '100%', height: '100%', pointerEvents: 'none' } },
            renderWidget(el, el.state || defaultState(el.type), t, {}),
          ),
    );
  });
}

/** Compact read-only preview of one page snapshot. */
export function ProductPagePreview(props) {
  const t = useT();
  const page = props.page;
  const frame = page.frame || { w: 390, h: 844, background: '#ffffff' };
  const maxW = props.maxWidth || 520;
  const maxH = props.maxHeight || 520;
  const scale = Math.min(maxW / Math.max(1, frame.w), maxH / Math.max(1, frame.h), 1);
  return h(
    'div',
    {
      style: {
        width: Math.max(1, Math.round(frame.w * scale)),
        height: Math.max(1, Math.round(frame.h * scale)),
        overflow: 'hidden',
        borderRadius: 12,
        background: frame.background || '#ffffff',
        boxShadow: '0 8px 28px rgba(17,24,39,.12), 0 0 0 1px rgba(17,24,39,.05)',
        flexShrink: 0,
      },
    },
    h(
      'div',
      {
        style: {
          width: frame.w,
          height: frame.h,
          position: 'relative',
          transform: 'scale(' + scale + ')',
          transformOrigin: 'top left',
          background: frame.background || '#ffffff',
        },
      },
      renderMiniElements(page.elements || [], t),
    ),
  );
}

/** One Visualize-style product card. */
export function ProductDesignCard(props) {
  const t = useT();
  const meta = props.meta;
  const page = meta.page || {};
  const frame = page.frame || { w: 390, h: 844 };
  const count = meta.pageCount || 1;
  const index = meta.pageIndex != null ? meta.pageIndex + 1 : 1;
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        border: '1px solid var(--dsw-alias-border-l1,#e5e6eb)',
        background: 'var(--dsw-alias-bg-base,#ffffff)',
        color: 'var(--dsw-alias-label-primary,#111827)',
        boxShadow: '0 1px 3px rgba(17,24,39,.05)',
        maxWidth: '100%',
        boxSizing: 'border-box',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
      },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
        h(
          'div',
          {
            style: {
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          meta.title || page.name || t('app.title'),
        ),
        h(
          'div',
          { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary,#6b7280)' } },
          `${frame.w}×${frame.h}${count > 1 ? ` · ${index}/${count}` : ''}`,
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: openCanvas,
          style: {
            border: '1px solid var(--dsw-alias-border-l2,#d6d9e2)',
            background: 'var(--dsw-alias-bg-layer-1,#fafafa)',
            color: 'inherit',
            borderRadius: 7,
            padding: '5px 10px',
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          },
        },
        t('visualize.openCanvas'),
      ),
    ),
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'center', maxWidth: '100%', overflow: 'auto' } },
      h(ProductPagePreview, { page, maxWidth: 520, maxHeight: 520 }),
    ),
  );
}

/** Turn-tail list of product cards. */
function ProductDesignCards(props) {
  const cards = cardsBefore(props.turn, props.seq);
  if (!cards.length) return null;
  return h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr)',
        gap: 12,
        margin: '8px 0 4px',
      },
    },
    cards.map((card) => h(ProductDesignCard, { key: card.callId, meta: card.meta })),
  );
}

/**
 * Register the conversation event collector and the turn-tail card seat.
 * Both are optional: hosts without the newer conversation surfaces simply do
 * not show the inline card, while the full canvas panel keeps working.
 */
export function registerProductDesignCards(ctx) {
  const disposers = [];
  try {
    if (ctx && ctx.slots && typeof ctx.slots.inject === 'function') {
      disposers.push(
        ctx.slots.inject('conversation.chat.turnTail', () =>
          ctx.slots.register(
            {
              name: 'conversation.chat.turnTail',
              id: 'dsh-product-design-cards',
              order: 110,
              priority: 110,
              select: selectTurnCards,
            },
            ProductDesignCards,
          ),
        ),
      );
    }
  } catch {
    /* slot not declared in this host */
  }
  try {
    if (ctx && typeof ctx.inject === 'function') {
      ctx.inject(['uiConversation'], (scope) => {
        const service = scope.get('uiConversation');
        if (service && service.events && typeof service.events.register === 'function') {
          const dispose = service.events.register(turnCardsDefinition);
          if (typeof dispose === 'function') disposers.push(dispose);
        }
      });
    }
  } catch {
    /* conversation event registry not available */
  }
  return () => {
    for (const dispose of disposers.splice(0)) {
      try {
        dispose();
      } catch {
        /* ignore */
      }
    }
  };
}
