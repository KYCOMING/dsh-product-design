/** Register the conversation event collector + turn-tail card seat. */
import { selectTurnCards, turnCardsDefinition } from './meta.js';
import { ProductDesignCards } from './ProductDesignCard.js';

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
