import {
  IconEye,
  IconMagnet,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRedo,
  IconUndo,
} from '../icons.js';
import { h } from '../react.js';
import { ExportMenu } from './exportmenu.js';

const stateLabels = {
  normal: 'state.normal',
  loading: 'state.loading',
  empty: 'state.empty',
  error: 'state.error',
};

const syncLabels = {
  local: 'toolbar.localOnly',
  saving: 'toolbar.saving',
  saved: 'toolbar.saved',
  offline: 'toolbar.offline',
  conflict: 'toolbar.conflict',
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
    togglePreview,
    undo,
    redo,
    canUndo,
    canRedo,
    syncState,
    setSelId,
    snapEnabled,
    toggleSnap,
    onExportPng,
    onExportHtml,
    onExportReact,
    onExpand,
    onCollapse,
  } = props;

  const toolbar = h(
    'div',
    { className: 'dpd-toolbar' },

    // ---- Left: document identity -------------------------------------
    h(
      'div',
      { className: 'dpd-toolbar-lead' },
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
        h('span', { className: 'dpd-brandText' }, t('app.title')),
      ),
      h('input', {
        className: 'dpd-nameInput',
        value: doc.name,
        placeholder: t('name.placeholder'),
        onChange: (e) => setDoc((d) => ({ ...d, name: e.target.value }), 'docname'),
      }),
    ),

    // ---- Right: controls, grouped and right-aligned ------------------
    h(
      'div',
      { className: 'dpd-toolbar-tools' },

      // Canvas frame + page state
      h(
        'div',
        { className: 'dpd-tgroup' },
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
      ),

      // History
      h(
        'div',
        { className: 'dpd-tgroup dpd-tgroup-flush' },
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
      ),

      // View: snapping + zoom stepper
      h(
        'div',
        { className: 'dpd-tgroup' },
        h(
          'button',
          {
            className: 'dpd-iconbtn dpd-snap' + (snapEnabled ? ' active' : ''),
            type: 'button',
            title: t('toolbar.snap'),
            'aria-label': t('toolbar.snap'),
            'aria-pressed': !!snapEnabled,
            onClick: toggleSnap,
          },
          h(IconMagnet),
        ),
        h(
          'div',
          { className: 'dpd-zoomer' },
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
            {
              className: 'dpd-zoom',
              type: 'button',
              title: '缩放至 100%',
              onClick: () => setZoom(1),
            },
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
        ),
      ),

      // Output: export / preview / save status / fullscreen
      h(
        'div',
        { className: 'dpd-tgroup dpd-tgroup-actions' },
        h(ExportMenu, {
          t,
          onPng: onExportPng,
          onHtml: onExportHtml,
          onReact: onExportReact,
        }),
        h(
          'button',
          {
            className: 'dpd-btn' + (preview ? ' primary' : ''),
            type: 'button',
            onClick: () => {
              togglePreview();
              setSelId(null);
            },
          },
          h(preview ? IconPencil : IconEye),
          preview ? t('toolbar.edit') : t('toolbar.preview'),
        ),
        h(
          'span',
          {
            className: 'dpd-saved' + (syncState === 'conflict' ? ' err' : ''),
            title: t(syncLabels[syncState] || 'toolbar.saved'),
          },
          t(syncLabels[syncState] || 'toolbar.saved'),
        ),
        onCollapse
          ? h(
              'button',
              { className: 'dpd-btn', type: 'button', onClick: onCollapse },
              '← ' + t('toolbar.backToChat'),
            )
          : null,
        onExpand
          ? h(
              'button',
              { className: 'dpd-btn', type: 'button', onClick: onExpand },
              t('toolbar.expand'),
            )
          : null,
      ),
    ),
  );

  return toolbar;
}
