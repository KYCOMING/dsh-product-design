import {
  IconEye,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRedo,
  IconReset,
  IconUndo,
} from '../icons.js';
import { h } from '../react.js';

const stateLabels = {
  normal: 'state.normal',
  loading: 'state.loading',
  empty: 'state.empty',
  error: 'state.error',
};

export function ToolbarView(props) {
  const {
    t,
    doc,
    setDoc,
    activePage,
    setPreset,
    pageState,
    setPageState,
    zoom,
    setZoom,
    preview,
    setPreview,
    resetDoc,
    undo,
    redo,
    canUndo,
    canRedo,
    setSelId,
  } = props;

  const toolbar = h(
    'div',
    { className: 'dpd-toolbar' },
    h(
      'span',
      { className: 'dpd-brand' },
      h(
        'svg',
        {
          width: 18,
          height: 18,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('rect', { x: 1.5, y: 2, width: 13, height: 11.5, rx: 2 }),
        h('path', { d: 'M1.5 5.4h13' }),
        h('rect', { x: 3.6, y: 8, width: 4, height: 3.2, rx: 0.6 }),
        h('circle', { cx: 10.6, cy: 9.6, r: 1.4 }),
      ),
      t('app.title'),
    ),
    h('input', {
      className: 'dpd-nameInput',
      value: doc.name,
      placeholder: t('name.placeholder'),
      onChange: (e) => setDoc((d) => ({ ...d, name: e.target.value }), 'docname'),
    }),
    h('div', { className: 'dpd-spacer' }),
    h(
      'select',
      {
        className: 'dpd-select',
        value: (activePage && activePage.frame.preset) || 'mobile',
        title: t('frame.title'),
        onChange: (e) => setPreset(e.target.value),
      },
      ['mobile', 'tablet', 'desktop'].map((k) =>
        h('option', { key: k, value: k }, t('frame.' + k)),
      ),
    ),
    h(
      'div',
      { className: 'dpd-seg', title: t('frame.title') },
      ['normal', 'loading', 'empty', 'error'].map((s) =>
        h(
          'button',
          {
            key: s,
            type: 'button',
            className: pageState === s ? 'active' : '',
            onClick: () => setPageState(s),
          },
          t(stateLabels[s]),
        ),
      ),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: t('toolbar.undo'),
        disabled: !canUndo,
        style: { opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default' },
        onClick: undo,
      },
      h(IconUndo),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: t('toolbar.redo'),
        disabled: !canRedo,
        style: { opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'default' },
        onClick: redo,
      },
      h(IconRedo),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: '缩小',
        onClick: () => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10)),
      },
      h(IconMinus),
    ),
    h(
      'button',
      { className: 'dpd-zoom', type: 'button', title: '重置为 100%', onClick: () => setZoom(1) },
      Math.round(zoom * 100) + '%',
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: '放大',
        onClick: () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10)),
      },
      h(IconPlus),
    ),
    h(
      'button',
      {
        className: 'dpd-btn' + (preview ? ' primary' : ''),
        type: 'button',
        onClick: () => {
          setPreview((v) => !v);
          setSelId(null);
        },
      },
      h(preview ? IconPencil : IconEye),
      preview ? t('toolbar.edit') : t('toolbar.preview'),
    ),
    h(
      'button',
      { className: 'dpd-iconbtn', type: 'button', title: t('toolbar.reset'), onClick: resetDoc },
      h(IconReset),
    ),
    h('span', { className: 'dpd-saved' }, t('toolbar.saved')),
  );

  return toolbar;
}
