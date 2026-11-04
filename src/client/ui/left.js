import { defaultState, LIB_ORDER } from '../constants.js';
import {
  IconComponents,
  IconCopy,
  IconLayers,
  IconPages,
  IconPlus,
  IconTrash,
  libGlyph,
  Svg,
} from '../icons.js';
import { h } from '../react.js';
import { renderWidget } from '../widgets.js';

export function LeftView(props) {
  const {
    t,
    doc,
    activePage,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    addElement,
    section,
    setSection,
    leftWidth,
    startResizeLeft,
    selId,
    setSelId,
    setPreview,
  } = props;

  // -------------------------------------------------- left: pages + library
  const pageRows = doc.pages.map((p) =>
    h(
      'div',
      {
        key: p.id,
        className: 'dpd-pageRow' + (p.id === activePage.id ? ' active' : ''),
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
    ),
  );

  const activeElements = (activePage && activePage.elements) || [];
  const layers = activeElements.slice().reverse();

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

  const componentsBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h('div', { className: 'dpd-panelTitle' }, h('span', null, t('library.title'))),
    h('div', { className: 'dpd-hint' }, t('library.hint')),
    h(
      'div',
      { className: 'dpd-libScroll' },
      h(
        'div',
        { className: 'dpd-libGrid' },
        LIB_ORDER.map((type) => {
          const sample = {
            id: 'lib-' + type,
            type,
            x: 0,
            y: 0,
            w: 120,
            h: 32,
            state: defaultState(type),
            props: {},
          };
          return h(
            'button',
            {
              key: type,
              type: 'button',
              className: 'dpd-libItem',
              onClick: () => addElement(type),
              title: t('comp.' + type),
            },
            h(
              'div',
              { className: 'dpd-libThumb' },
              h(
                'div',
                {
                  style: {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 96,
                    height: 30,
                    transform: 'translate(-50%,-50%) scale(.62)',
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                  },
                },
                renderWidget(sample, defaultState(type), t, {}),
              ),
            ),
            h('span', { className: 'dpd-libName' }, t('comp.' + type)),
          );
        }),
      ),
    ),
  );

  const layersBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('layers.title')),
      h(
        'span',
        {
          style: {
            textTransform: 'none',
            letterSpacing: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
        activePage ? activePage.name : '',
      ),
    ),
    h(
      'div',
      { className: 'dpd-layers' },
      layers.map((el) =>
        h(
          'div',
          {
            key: el.id,
            className: 'dpd-layer' + (selId === el.id ? ' active' : ''),
            onClick: () => {
              setSelId(el.id);
              setPreview(false);
              setActivePage(activePage.id);
            },
          },
          h('span', { className: 'dot' }, h(Svg, { size: 13 }, libGlyph(el.type))),
          h('span', { className: 'nm' }, el.props.text || t('comp.' + el.type)),
        ),
      ),
    ),
  );

  const sectionContent =
    section === 'pages'
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
