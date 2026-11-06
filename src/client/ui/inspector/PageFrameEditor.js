/** Page / artboard frame editor (no selection) — extracted from InspectorView. */
import { h } from '../../react.js';

export function PageFrameEditor(props) {
  const {
    t,
    activePage,
    renameActivePage,
    setPreset,
    patchActiveFrame,
    resizeMode,
    setResizeMode,
    fitContentToFrame,
  } = props;
  return h(
    'div',
    { key: 'page' },
    h('div', { className: 'dpd-empty' }, t('inspector.empty')),
    h(
      'div',
      { className: 'dpd-section' },
      h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.frame'))),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.pageName')),
        h('input', {
          className: 'dpd-input',
          type: 'text',
          value: activePage ? activePage.name : '',
          onChange: (e) => renameActivePage(e.target.value),
        }),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('frame.title')),
        h(
          'select',
          {
            className: 'dpd-select',
            style: { flex: 1 },
            value: (activePage && activePage.frame.preset) || 'mobile',
            onChange: (e) => setPreset(e.target.value),
          },
          ['mobile', 'tablet', 'desktop'].map((k) =>
            h('option', { key: k, value: k }, t('frame.' + k)),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.background')),
        h('input', {
          className: 'dpd-color',
          type: 'color',
          value: (activePage && activePage.frame.background) || '#ffffff',
          onChange: (e) => patchActiveFrame({ background: e.target.value }),
        }),
        h('input', {
          className: 'dpd-input',
          type: 'text',
          value: (activePage && activePage.frame.background) || '#ffffff',
          onChange: (e) => patchActiveFrame({ background: e.target.value }),
        }),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.resizeMode')),
        h(
          'select',
          {
            className: 'dpd-select',
            style: { flex: 1 },
            value: resizeMode,
            onChange: (e) => setResizeMode(e.target.value),
          },
          ['constraints', 'scale', 'none'].map((mode) =>
            h('option', { key: mode, value: mode }, t('resizeMode.' + mode)),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-actions' },
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: fitContentToFrame },
          t('inspector.fitContent'),
        ),
      ),
    ),
  );
}
