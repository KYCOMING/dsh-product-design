/** Layer tree panel with drag/drop + inline rename (extracted from LeftView). */
import { isContainerType } from '../../../shared/elements.js';
import { IconEye, libGlyph, Svg } from '../../icons.js';
import { h, useState } from '../../react.js';
import { LockGlyph, layerLabel } from './labels.js';

export function LayersPanel(props) {
  const {
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
  } = props;
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

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

  return layersBody;
}
