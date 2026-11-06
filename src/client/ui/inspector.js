import { ACCENT } from '../constants.js';
import { h } from '../react.js';
import { ElementPanel } from './inspector/ElementPanel.js';
import { MultiSelectPanel } from './inspector/MultiSelectPanel.js';
import { PageFrameEditor } from './inspector/PageFrameEditor.js';

export function InspectorView(props) {
  const {
    t,
    doc,
    sel,
    selCount,
    activePage,
    resizeMode,
    setResizeMode,
    fitContentToFrame,
    onImageError,
    setPreset,
    renameActivePage,
    patchActiveFrame,
    duplicateEl,
    bringFront,
    sendBack,
    deleteEl,
    alignSelection,
    distributeSelection,
    groupSelection,
    ungroupSelection,
    applyAttrs,
    applyProps,
    rightWidth,
    rightCollapsed,
    toggleRight,
    startResizeRight,
  } = props;

  if (rightCollapsed) {
    return h(
      'div',
      { className: 'dpd-right collapsed' },
      h(
        'button',
        {
          className: 'dpd-rightToggle',
          type: 'button',
          title: t('inspector.expand'),
          'aria-label': t('inspector.expand'),
          onClick: toggleRight,
        },
        '«',
      ),
    );
  }

  function numInput(value, onChange) {
    return h('input', {
      className: 'dpd-input',
      type: 'number',
      value: value,
      onChange: (e) => {
        const v = parseInt(e.target.value, 10);
        onChange(isNaN(v) ? 0 : v);
      },
    });
  }

  const alignButtons = [
    ['left', 'align.left'],
    ['centerX', 'align.centerX'],
    ['right', 'align.right'],
    ['top', 'align.top'],
    ['centerY', 'align.centerY'],
    ['bottom', 'align.bottom'],
  ].map(([mode, key]) =>
    h(
      'button',
      {
        key: mode,
        type: 'button',
        className: 'dpd-alignBtn',
        title: t(key),
        onClick: () => alignSelection(mode),
      },
      t(key),
    ),
  );

  const colorRow = (value, onChange, label) =>
    h(
      'div',
      { className: 'dpd-row' },
      h('label', null, label),
      h('input', {
        className: 'dpd-color',
        type: 'color',
        value: value || ACCENT,
        onChange: (e) => onChange(e.target.value),
      }),
      h('input', {
        className: 'dpd-input',
        type: 'text',
        value: value || ACCENT,
        onChange: (e) => onChange(e.target.value),
      }),
    );

  let inspectorBody;
  if (selCount > 1) {
    inspectorBody = h(MultiSelectPanel, {
      t,
      selCount,
      numInput,
      colorRow,
      alignButtons,
      applyProps,
      applyAttrs,
      distributeSelection,
      groupSelection,
      deleteEl,
    });
  } else if (sel) {
    inspectorBody = h(ElementPanel, {
      t,
      onImageError,
      sel,
      doc,
      applyAttrs,
      applyProps,
      duplicateEl,
      bringFront,
      sendBack,
      deleteEl,
      alignSelection,
      distributeSelection,
      groupSelection,
      ungroupSelection,
      numInput,
      colorRow,
      alignButtons,
    });
  } else {
    inspectorBody = h(PageFrameEditor, {
      t,
      activePage,
      renameActivePage,
      setPreset,
      patchActiveFrame,
      resizeMode,
      setResizeMode,
      fitContentToFrame,
    });
  }

  const right = h(
    'div',
    { className: 'dpd-right', style: { width: rightWidth || 242 } },
    h('div', { className: 'dpd-resizer left', onMouseDown: startResizeRight }),
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('inspector.title')),
      h(
        'button',
        {
          className: 'dpd-mini',
          type: 'button',
          title: t('inspector.collapse'),
          'aria-label': t('inspector.collapse'),
          onClick: toggleRight,
        },
        '»',
      ),
    ),
    inspectorBody,
  );

  return right;
}
