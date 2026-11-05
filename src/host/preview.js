/**
 * Chat-card descriptor attached to tool results, so the turn can render a
 * compact preview of the page the model just edited.
 */

import { emptyDoc, ensureDoc } from './model.js';

/** Build the inline preview descriptor attached to an apply result. */
function productPreviewMeta(store, results) {
  const snapshot = store.snapshot();
  const doc = ensureDoc(snapshot.doc ?? emptyDoc());
  const pageIds = Array.isArray(results)
    ? results.map((result) => result && result.pageId).filter(Boolean)
    : [];
  let page = null;
  for (let i = pageIds.length - 1; i >= 0 && !page; i -= 1) {
    page = doc.pages.find((candidate) => candidate.id === pageIds[i]) || null;
  }
  if (!page)
    page = doc.pages.find((candidate) => candidate.id === doc.activePageId) || doc.pages[0];
  if (!page) return null;
  const index = doc.pages.findIndex((candidate) => candidate.id === page.id);
  return {
    kind: 'product-design',
    title: page.name || 'Product design',
    pageId: page.id,
    pageIndex: index,
    pageCount: doc.pages.length,
    page: { id: page.id, name: page.name, frame: page.frame, elements: page.elements },
    revision: snapshot.revision,
  };
}

export { productPreviewMeta };
