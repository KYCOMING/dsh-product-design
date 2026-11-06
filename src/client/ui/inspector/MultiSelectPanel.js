/** Multi-selection inspector body (extracted from InspectorView). */
import { IconTrash } from '../../icons.js';
import { h } from '../../react.js';

export function MultiSelectPanel(props) {
  const {
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
  } = props;
  return h(
    'div',
    { key: 'multi' },
    h('div', { className: 'dpd-empty' }, t('inspector.multi') + ' · ' + selCount),
    h('div', { className: 'dpd-hint' }, t('inspector.multiHint')),
    colorRow(null, (v) => applyProps({ color: v }, 'mcolor'), t('inspector.color')),
    h(
      'div',
      { className: 'dpd-row' },
      h('label', null, t('inspector.fontSize')),
      numInput(14, (v) => applyProps({ fontSize: v }, 'mfs')),
      h('label', null, t('inspector.radius')),
      numInput(8, (v) => applyProps({ radius: v }, 'mradius')),
    ),
    h(
      'div',
      { className: 'dpd-row' },
      h('label', null, t('inspector.opacity')),
      h('input', {
        className: 'dpd-input',
        type: 'number',
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 100,
        onChange: (e) => {
          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
          applyAttrs({ opacity: v / 100 }, 'mopacity');
        },
      }),
    ),
    h(
      'div',
      { className: 'dpd-section' },
      h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.align'))),
      h('div', { className: 'dpd-alignGrid' }, alignButtons),
      h(
        'div',
        { className: 'dpd-actions' },
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: () => distributeSelection('x') },
          t('align.distributeH'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: () => distributeSelection('y') },
          t('align.distributeV'),
        ),
      ),
    ),
    h(
      'div',
      { className: 'dpd-actions' },
      h(
        'button',
        { className: 'dpd-btn primary', type: 'button', onClick: groupSelection },
        t('inspector.group'),
      ),
      h(
        'button',
        { className: 'dpd-btn', type: 'button', onClick: deleteEl },
        h(IconTrash),
        t('inspector.delete'),
      ),
    ),
  );
}
