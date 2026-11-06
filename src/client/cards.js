/**
 * Inline product-design cards. Split into ./cards/*.js; this entry re-exports
 * the public surface (kept stable for client/index.js and tests).
 */

export { foldCard, productDesignMetaFrom, turnCardsDefinition } from './cards/meta.js';
export { activateDesignTab, setCanvasOpener } from './cards/openCanvas.js';
export { ProductDesignCard } from './cards/ProductDesignCard.js';
export { ProductPagePreview } from './cards/preview.js';
export { registerProductDesignCards } from './cards/register.js';
