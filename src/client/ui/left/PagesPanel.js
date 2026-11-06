/** Pages list panel (extracted from LeftView). */
import { IconCopy, IconPlus, IconTrash } from '../../icons.js';
import { h } from '../../react.js';

export function PagesPanel(props) {
  const { t, doc, activePage, setActivePage, addPage, duplicatePage, deletePage } = props;
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
        h('span', { className: 'nm' }, p.name),
        h('span', { className: 'sz' }, p.frame.w + '×' + p.frame.h),
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
