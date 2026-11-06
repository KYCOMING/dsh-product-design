/** Tool-result meta parsing + turn-event collector (pure). */
const PRODUCT_DESIGN_META_KIND = 'product-design';
const PRODUCT_DESIGN_TURN_KEY = 'product-design';

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
export function cardsBefore(turn, seq) {
  const cards = (turn && turn.data && turn.data.get(PRODUCT_DESIGN_TURN_KEY)?.cards) || [];
  return cards.filter((card) => card.seq < seq);
}

/** Chain selector compatible with the turn-tail slot's older shape. */
export function selectTurnCards(owner) {
  if (!owner) return null;
  const cards = cardsBefore(owner.turn, owner.seq);
  return cards.length ? cards : null;
}
