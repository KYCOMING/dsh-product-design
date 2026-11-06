/** Pure view-model computations extracted from panel.js. */
import { statePageId } from '../../shared/page-states.js';

/** Derive the page currently shown (preview stack vs active) and its state variants. */
export function previewViewModels(doc, activePage, preview, previewStack) {
  const viewPage = preview
    ? doc.pages.find((page) => page.id === previewStack[previewStack.length - 1]) || activePage
    : activePage;
  const previewBase =
    viewPage && viewPage.variantOf
      ? doc.pages.find((page) => page.id === viewPage.variantOf) || null
      : viewPage;
  const previewStateKey = viewPage && viewPage.variantOf ? viewPage.stateKey : 'normal';
  const previewStateIds = {
    loading: statePageId(doc, previewBase ? previewBase.id : '', 'loading'),
    empty: statePageId(doc, previewBase ? previewBase.id : '', 'empty'),
    error: statePageId(doc, previewBase ? previewBase.id : '', 'error'),
  };
  const hasPreviewState =
    previewStateKey !== 'normal' || Object.values(previewStateIds).some(Boolean);
  return { viewPage, previewBase, previewStateKey, previewStateIds, hasPreviewState };
}

/** Build the selected-element breadcrumb trail (page › ancestors › element). */
export function breadcrumbModel(activePage, crumbEntry, entryById, t) {
  if (!activePage) return [];
  return [
    { id: activePage.id, label: activePage.name },
    ...(crumbEntry
      ? crumbEntry.ancestors.map((id) => {
          const entry = entryById.get(id);
          return {
            id,
            label: entry ? entry.el.name || entry.el.props.name || t('comp.' + entry.el.type) : id,
          };
        })
      : []),
    ...(crumbEntry
      ? [
          {
            id: crumbEntry.el.id,
            label:
              crumbEntry.el.name || crumbEntry.el.props.text || t('comp.' + crumbEntry.el.type),
          },
        ]
      : []),
  ];
}
