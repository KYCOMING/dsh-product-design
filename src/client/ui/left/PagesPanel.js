/** Pages list panel (extracted from LeftView). */
import { IconCopy, IconPencil, IconPlus, IconTrash } from '../../icons.js';
import { h, useState } from '../../react.js';

export function PagesPanel(props) {
  const { t, doc, activePage, setActivePage, addPage, duplicatePage, deletePage, renamePage } =
    props;
  const [renamingPage, setRenamingPage] = useState(null);
  const [pageNameValue, setPageNameValue] = useState('');

  const beginPageRename = (page) => {
    setRenamingPage(page.id);
    setPageNameValue(page.name || '');
  };

  const commitPageRename = (page) => {
    const value = pageNameValue.trim();
    setRenamingPage(null);
    if (value && value !== (page.name || '') && renamePage) renamePage(page.id, value);
  };

  const pageRows = doc.pages
    .filter((p) => !p.variantOf)
    .map((p) => {
      const stateActive = activePage && activePage.variantOf === p.id;
      return h(
        'div',
        {
          key: p.id,
          className: 'dpd-pageRow' + (p.id === activePage.id || stateActive ? ' active' : ''),
          onClick: () => setActivePage(p.id),
        },
        renamingPage === p.id
          ? h('input', {
              className: 'nmInput',
              value: pageNameValue,
              autoFocus: true,
              onClick: (e) => e.stopPropagation(),
              onChange: (e) => setPageNameValue(e.target.value),
              onBlur: () => commitPageRename(p),
              onKeyDown: (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitPageRename(p);
                else if (e.key === 'Escape') setRenamingPage(null);
              },
            })
          : h(
              'span',
              {
                className: 'nm',
                title: t('pages.rename'),
                onDoubleClick: (e) => {
                  e.stopPropagation();
                  beginPageRename(p);
                },
              },
              p.name,
            ),
        h('span', { className: 'sz' }, `${p.frame.w}×${p.frame.h}`),
        h(
          'button',
          {
            className: 'dpd-mini',
            type: 'button',
            title: t('pages.rename'),
            onClick: (e) => {
              e.stopPropagation();
              beginPageRename(p);
            },
          },
          h(IconPencil),
        ),
        h(
          'button',
          {
            className: 'dpd-mini',
            type: 'button',
            title: t('pages.duplicate'),
            onClick: (e) => {
              e.stopPropagation();
              duplicatePage(p.id);
            },
          },
          h(IconCopy),
        ),
        h(
          'button',
          {
            className: 'dpd-mini',
            type: 'button',
            title: t('pages.delete'),
            onClick: (e) => {
              e.stopPropagation();
              deletePage(p.id);
            },
          },
          h(IconTrash),
        ),
        stateActive && activePage && activePage.stateKey
          ? h('span', { className: 'sz' }, t('state.' + activePage.stateKey))
          : null,
      );
    });

  const pagesBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('pages.title')),
      h(
        'button',
        { className: 'dpd-mini', type: 'button', title: t('pages.add'), onClick: addPage },
        h(IconPlus),
      ),
    ),
    h('div', { className: 'dpd-pages' }, pageRows),
  );

  return pagesBody;
}
