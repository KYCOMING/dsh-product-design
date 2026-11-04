import { ACCENT, defaultState, TYPE_INFO } from '../constants.js';
import { IconBack, IconCopy, IconFront, IconTrash } from '../icons.js';
import { h } from '../react.js';

export function InspectorView(props) {
  const {
    t,
    sel,
    activePage,
    setEl,
    setElProps,
    duplicateEl,
    bringFront,
    sendBack,
    deleteEl,
    setPreset,
    renameActivePage,
    patchActiveFrame,
  } = props;

  // -------------------------------------------------- right: inspector + layers
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

  let inspectorBody;
  if (sel) {
    const info = TYPE_INFO[sel.type] || TYPE_INFO.text;
    const stateList = info.states || ['default'];
    inspectorBody = h(
      'div',
      null,
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.position')),
        h(
          'div',
          { className: 'dpd-numPair' },
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'X'),
            numInput(sel.x, (v) => setEl(sel.id, { x: v }, 'x:' + sel.id)),
          ),
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'Y'),
            numInput(sel.y, (v) => setEl(sel.id, { y: v }, 'y:' + sel.id)),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.size')),
        h(
          'div',
          { className: 'dpd-numPair' },
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'W'),
            numInput(sel.w, (v) => setEl(sel.id, { w: Math.max(16, v) }, 'w:' + sel.id)),
          ),
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'H'),
            numInput(sel.h, (v) => setEl(sel.id, { h: Math.max(12, v) }, 'h:' + sel.id)),
          ),
        ),
      ),
      info.hasText
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.text')),
            h('input', {
              className: 'dpd-input',
              type: 'text',
              value: sel.props.text || '',
              placeholder: t('sample.text'),
              onChange: (e) => setElProps(sel.id, { text: e.target.value }, 'text:' + sel.id),
            }),
          )
        : null,
      info.hasColor || info.hasText
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.color')),
            h('input', {
              className: 'dpd-color',
              type: 'color',
              value: sel.props.color || ACCENT,
              onChange: (e) => setElProps(sel.id, { color: e.target.value }, 'color:' + sel.id),
            }),
            h('input', {
              className: 'dpd-input',
              type: 'text',
              value: sel.props.color || ACCENT,
              onChange: (e) => setElProps(sel.id, { color: e.target.value }, 'color:' + sel.id),
            }),
          )
        : null,
      info.hasFont
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.fontSize')),
            numInput(sel.props.fontSize || 14, (v) =>
              setElProps(sel.id, { fontSize: v }, 'fs:' + sel.id),
            ),
          )
        : null,
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.radius')),
        numInput(sel.props.radius != null ? sel.props.radius : 8, (v) =>
          setElProps(sel.id, { radius: v }, 'radius:' + sel.id),
        ),
      ),
      h(
        'div',
        { className: 'dpd-section' },
        h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.state'))),
        h(
          'div',
          { className: 'dpd-chips' },
          stateList.map((s) =>
            h(
              'button',
              {
                key: s,
                type: 'button',
                className:
                  'dpd-chip' + ((sel.state || defaultState(sel.type)) === s ? ' active' : ''),
                onClick: () => setEl(sel.id, { state: s }),
              },
              t('stateName.' + s),
            ),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-actions' },
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: duplicateEl },
          h(IconCopy),
          t('inspector.duplicate'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: bringFront },
          h(IconFront),
          t('inspector.front'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: sendBack },
          h(IconBack),
          t('inspector.back'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: deleteEl },
          h(IconTrash),
          t('inspector.delete'),
        ),
      ),
    );
  } else {
    inspectorBody = h(
      'div',
      null,
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
      ),
    );
  }

  const right = h(
    'div',
    { className: 'dpd-right' },
    h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.title'))),
    inspectorBody,
  );

  return right;
}
