import { IconComponents, IconDesign, IconLayers, IconPages } from '../icons.js';
import { h } from '../react.js';
import { DocsPanel } from './left/DocsPanel.js';
import { LayersPanel } from './left/LayersPanel.js';
import { LibraryPanel } from './left/LibraryPanel.js';
import { PagesPanel } from './left/PagesPanel.js';

export function LeftView(props) {
  const {
    t,
    doc,
    activePage,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    renamePage,
    addElement,
    section,
    setSection,
    leftWidth,
    startResizeLeft,
    selIds,
    setSelId,
    setPreview,
    setEl,
    onLayerMove,
    layerQuery,
    setLayerQuery,
    docs,
    docsReady,
    docsError,
    activeDocId,
    onOpenDoc,
    onCreateDoc,
    onDuplicateDoc,
    onRenameDoc,
    onDeleteDoc,
    onExportDoc,
    onRefreshDocs,
  } = props;

  // -------------------------------------------------- left: pages + library
  const railBtn = (id, icon, label) =>
    h(
      'button',
      {
        type: 'button',
        className: 'dpd-railbtn' + (section === id ? ' active' : ''),
        title: label,
        'aria-label': label,
        onClick: () => setSection((cur) => (cur === id ? null : id)),
      },
      h(icon),
    );

  const docsBody = h(DocsPanel, {
    t,
    docs,
    docsReady,
    docsError,
    activeDocId,
    onOpenDoc,
    onCreateDoc,
    onDuplicateDoc,
    onRenameDoc,
    onDeleteDoc,
    onExportDoc,
    onRefreshDocs,
  });

  const pagesBody = h(PagesPanel, {
    t,
    doc,
    activePage,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    renamePage,
  });

  const componentsBody = h(LibraryPanel, { t, addElement });

  const layersBody = h(LayersPanel, {
    t,
    activePage,
    selIds,
    setSelId,
    setPreview,
    setActivePage,
    setEl,
    onLayerMove,
    layerQuery,
    setLayerQuery,
  });

  const sectionContent =
    section === 'docs'
      ? docsBody
      : section === 'pages'
        ? pagesBody
        : section === 'components'
          ? componentsBody
          : section === 'layers'
            ? layersBody
            : null;

  const left = h(
    'div',
    { className: 'dpd-leftcol' },
    h(
      'div',
      { className: 'dpd-rail' },
      railBtn('docs', IconDesign, t('docs.title')),
      railBtn('pages', IconPages, t('pages.title')),
      railBtn('components', IconComponents, t('library.title')),
      railBtn('layers', IconLayers, t('layers.title')),
    ),
    sectionContent
      ? h(
          'div',
          { className: 'dpd-sectionwrap', style: { width: leftWidth } },
          sectionContent,
          h('div', { className: 'dpd-resizer', onMouseDown: startResizeLeft }),
        )
      : null,
  );

  return left;
}
