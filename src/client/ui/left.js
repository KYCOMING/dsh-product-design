import { isContainerType } from '../../shared/elements.js';
import { defaultState, LIB_ORDER } from '../constants.js';
import {
  IconComponents,
  IconCopy,
  IconDesign,
  IconDownload,
  IconEye,
  IconLayers,
  IconPages,
  IconPencil,
  IconPlus,
  IconTrash,
  libGlyph,
  Svg,
} from '../icons.js';
import { h, useEffect, useState } from '../react.js';
import { renderWidget } from '../widgets.js';

function LockGlyph(props) {
  const locked = props.locked;
  return h(
    'svg',
    {
      width: 13,
      height: 13,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    h('rect', { x: 3.5, y: 7, width: 9, height: 6.5, rx: 1.6 }),
    locked
      ? h('path', { d: 'M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7' })
      : h('path', { d: 'M5.5 7V5.4a2.5 2.5 0 0 1 4.7-1.2' }),
  );
}

function layerLabel(el, t) {
  return el.name || el.props.text || el.props.name || t('comp.' + el.type);
}

function docTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

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

  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, position }
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [docNameValue, setDocNameValue] = useState('');

  useEffect(() => {
    if (section === 'docs' && onRefreshDocs) onRefreshDocs();
  }, [section, onRefreshDocs]);

  // -------------------------------------------------- left: pages + library
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

  const activeElements = (activePage && activePage.elements) || [];
  const query = (layerQuery || '').trim().toLowerCase();
  const layerRows = [];
  const collectRows = (elements, depth) => {
    elements
      .slice()
      .reverse()
      .forEach((el) => {
        const label = layerLabel(el, t);
        const matches = !query || label.toLowerCase().includes(query);
        if (matches) layerRows.push({ el, depth, label });
        if (isContainerType(el.type) && Array.isArray(el.children)) {
          collectRows(el.children, depth + 1);
        }
      });
  };
  collectRows(activeElements, 0);
  const selectedSet = new Set(selIds || []);

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

  const commitDocRename = (item) => {
    const value = docNameValue.trim();
    setRenamingDoc(null);
    if (value && value !== (item.name || '')) onRenameDoc(item.id, value);
  };

  const docAction = (icon, title, onClick) =>
    h(
      'button',
      {
        className: 'dpd-mini',
        type: 'button',
        title,
        'aria-label': title,
        onClick: (e) => {
          e.stopPropagation();
          onClick();
        },
      },
      h(icon, { size: 12 }),
    );

  const docsBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('docs.title')),
      h(
        'span',
        { style: { textTransform: 'none', letterSpacing: 0 } },
        String((docs || []).length),
      ),
    ),
    h(
      'div',
      { className: 'dpd-docBar' },
      h(
        'button',
        { className: 'dpd-btn', type: 'button', onClick: onCreateDoc },
        h(IconPlus),
        t('docs.add'),
      ),
    ),
    docsError ? h('div', { className: 'dpd-hint' }, docsError) : null,
    !docsReady && !docsError ? h('div', { className: 'dpd-hint' }, t('docs.offline')) : null,
    h(
      'div',
      { className: 'dpd-docs' },
      (docs || []).length === 0
        ? h('div', { className: 'dpd-empty' }, t('docs.empty'))
        : (docs || []).map((item) => {
            const active = item.id === activeDocId;
            const name = item.name || t('docs.untitled');
            return h(
              'div',
              {
                key: item.id,
                className: 'dpd-docRow' + (active ? ' active' : ''),
                onClick: () => onOpenDoc(item.id),
              },
              h('span', { className: 'dot' }, h(IconDesign, { size: 13 })),
              h(
                'div',
                { className: 'dpd-docMain' },
                renamingDoc === item.id
                  ? h('input', {
                      className: 'nmInput',
                      value: docNameValue,
                      autoFocus: true,
                      onClick: (e) => e.stopPropagation(),
                      onChange: (e) => setDocNameValue(e.target.value),
                      onBlur: () => commitDocRename(item),
                      onKeyDown: (e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitDocRename(item);
                        else if (e.key === 'Escape') setRenamingDoc(null);
                      },
                    })
                  : h(
                      'span',
                      {
                        className: 'nm',
                        title: t('docs.rename'),
                        onDoubleClick: (e) => {
                          e.stopPropagation();
                          setRenamingDoc(item.id);
                          setDocNameValue(item.name || '');
                        },
                      },
                      name,
                    ),
                h(
                  'span',
                  { className: 'meta' },
                  `${item.pages} ${t('docs.pages')}` +
                    (item.updatedAt ? ` · ${docTime(item.updatedAt)}` : ''),
                ),
              ),
              h(
                'div',
                { className: 'dpd-docActions' },
                docAction(IconPencil, t('docs.rename'), () => {
                  setRenamingDoc(item.id);
                  setDocNameValue(item.name || '');
                }),
                docAction(IconCopy, t('docs.duplicate'), () => onDuplicateDoc(item.id)),
                docAction(IconDownload, t('docs.export'), () => onExportDoc(item.id)),
                docAction(IconTrash, t('docs.delete'), () => {
                  // The active (selected) draft is protected — remove() reports
                  // why instead of asking to confirm an impossible deletion.
                  if (item.id === activeDocId) {
                    onDeleteDoc(item.id);
                    return;
                  }
                  if (window.confirm(t('docs.deleteConfirm'))) onDeleteDoc(item.id);
                }),
              ),
            );
          }),
    ),
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

  const commitRename = (el) => {
    const value = renameValue.trim();
    setRenaming(null);
    if (value && value !== layerLabel(el, t)) setEl(el.id, { name: value });
  };

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
      { className: 'dpd-search' },
      h('input', {
        type: 'search',
        value: layerQuery || '',
        placeholder: t('layers.search'),
        onChange: (e) => setLayerQuery(e.target.value),
      }),
    ),
    h(
      'div',
      { className: 'dpd-layers' },
      layerRows.length === 0
        ? h('div', { className: 'dpd-empty' }, t('layers.empty'))
        : layerRows.map(({ el, depth, label }) => {
            const isDrop = dropTarget && dropTarget.id === el.id;
            let cls = 'dpd-layer';
            if (selectedSet.has(el.id)) cls += ' active';
            if (el.hidden) cls += ' off';
            if (dragId === el.id) cls += ' dragging';
            if (isDrop) cls += ' drop-' + dropTarget.position;
            return h(
              'div',
              {
                key: el.id,
                className: cls,
                draggable: true,
                style: { paddingLeft: 8 + depth * 16 },
                onClick: () => {
                  setSelId(el.id);
                  setPreview(false);
                  setActivePage(activePage.id);
                },
                onDragStart: (e) => {
                  setDragId(el.id);
                  try {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', el.id);
                  } catch {
                    /* ignore */
                  }
                },
                onDragEnd: () => {
                  setDragId(null);
                  setDropTarget(null);
                },
                onDragOver: (e) => {
                  if (!dragId || dragId === el.id) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientY - rect.top) / Math.max(1, rect.height);
                  const position =
                    isContainerType(el.type) && ratio > 0.25 && ratio < 0.75
                      ? 'inside'
                      : ratio < 0.5
                        ? 'before'
                        : 'after';
                  setDropTarget({ id: el.id, position });
                },
                onDragLeave: () => {
                  setDropTarget((cur) => (cur && cur.id === el.id ? null : cur));
                },
                onDrop: (e) => {
                  e.preventDefault();
                  const source = dragId || e.dataTransfer.getData('text/plain');
                  const position =
                    dropTarget && dropTarget.id === el.id ? dropTarget.position : 'after';
                  setDragId(null);
                  setDropTarget(null);
                  if (source && source !== el.id) onLayerMove(source, el.id, position);
                },
              },
              isContainerType(el.type) ? h('span', { className: 'caret' }, '▾') : null,
              h('span', { className: 'dot' }, h(Svg, { size: 13 }, libGlyph(el.type))),
              renaming === el.id
                ? h('input', {
                    className: 'nmInput',
                    value: renameValue,
                    autoFocus: true,
                    onClick: (e) => e.stopPropagation(),
                    onChange: (e) => setRenameValue(e.target.value),
                    onBlur: () => commitRename(el),
                    onKeyDown: (e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitRename(el);
                      else if (e.key === 'Escape') setRenaming(null);
                    },
                  })
                : h(
                    'span',
                    {
                      className: 'nm',
                      title: t('layers.rename'),
                      onDoubleClick: (e) => {
                        e.stopPropagation();
                        setRenaming(el.id);
                        setRenameValue(label);
                      },
                    },
                    label,
                  ),
              h(
                'button',
                {
                  className: 'eye' + (el.hidden ? ' on' : ''),
                  type: 'button',
                  title: el.hidden ? t('layers.show') : t('layers.hide'),
                  'aria-label': el.hidden ? t('layers.show') : t('layers.hide'),
                  onClick: (e) => {
                    e.stopPropagation();
                    setEl(el.id, { hidden: !el.hidden });
                  },
                },
                h(IconEye, { size: 13 }),
              ),
              h(
                'button',
                {
                  className: 'lock' + (el.locked ? ' on' : ''),
                  type: 'button',
                  title: el.locked ? t('layers.unlock') : t('layers.lock'),
                  'aria-label': el.locked ? t('layers.unlock') : t('layers.lock'),
                  onClick: (e) => {
                    e.stopPropagation();
                    setEl(el.id, { locked: !el.locked });
                  },
                },
                h(LockGlyph, { locked: el.locked }),
              ),
            );
          }),
    ),
  );

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
