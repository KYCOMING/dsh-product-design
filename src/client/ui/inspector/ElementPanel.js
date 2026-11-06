/** Single-element property editor (extracted from InspectorView). */
import { isContainerType } from '../../../shared/elements.js';
import { H_MODES, V_MODES } from '../../../shared/layout.js';
import { defaultState, TYPE_INFO } from '../../constants.js';
import { chooseImageFile } from '../../editor/pickImage.js';
import { IconBack, IconCopy, IconFront, IconTrash } from '../../icons.js';
import { h } from '../../react.js';

export function ElementPanel(props) {
  const {
    t,
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
    onImageError,
  } = props;

  const info = TYPE_INFO[sel.type] || TYPE_INFO.text;
  const stateList = info.states || ['default'];
  const pages = (doc && doc.pages) || [];
  const interactions = sel.interactions || [];
  return h(
    'div',
    { key: 'single' },
    h(
      'div',
      { className: 'dpd-row' },
      h('label', null, t('inspector.name')),
      h('input', {
        className: 'dpd-input',
        type: 'text',
        value: sel.name || '',
        placeholder: sel.props.text || sel.props.name || t('comp.' + sel.type),
        onChange: (e) => applyAttrs({ name: e.target.value }, 'name:' + sel.id),
      }),
    ),
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
          numInput(sel.x, (v) => applyAttrs({ x: v }, 'x:' + sel.id)),
        ),
        h(
          'div',
          { className: 'dpd-field' },
          h('span', null, 'Y'),
          numInput(sel.y, (v) => applyAttrs({ y: v }, 'y:' + sel.id)),
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
          numInput(sel.w, (v) => applyAttrs({ w: Math.max(16, v) }, 'w:' + sel.id)),
        ),
        h(
          'div',
          { className: 'dpd-field' },
          h('span', null, 'H'),
          numInput(sel.h, (v) => applyAttrs({ h: Math.max(12, v) }, 'h:' + sel.id)),
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
            onChange: (e) => applyProps({ text: e.target.value }, 'text:' + sel.id),
          }),
        )
      : null,
    sel.type === 'image'
      ? h(
          'div',
          { className: 'dpd-section' },
          h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.image'))),
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.imageUrl')),
            h('input', {
              className: 'dpd-input',
              type: 'text',
              value: sel.props.src || '',
              placeholder: 'https://…',
              onChange: (e) => applyProps({ src: e.target.value }, 'src:' + sel.id),
            }),
          ),
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.imageFit')),
            h(
              'select',
              {
                className: 'dpd-select',
                style: { flex: 1 },
                value: sel.props.fit || 'cover',
                onChange: (e) => applyProps({ fit: e.target.value }, 'fit:' + sel.id),
              },
              ['cover', 'contain', 'fill'].map((fit) =>
                h('option', { key: fit, value: fit }, t('inspector.fit.' + fit)),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dpd-row' },
            h(
              'button',
              {
                className: 'dpd-btn',
                type: 'button',
                onClick: () =>
                  chooseImageFile({
                    onPick: (src) => applyProps({ src }, 'src:' + sel.id),
                    onError: () => {
                      onImageError();
                    },
                  }),
              },
              t('inspector.chooseImage'),
            ),
            sel.props.src
              ? h(
                  'button',
                  {
                    className: 'dpd-btn',
                    type: 'button',
                    onClick: () => applyProps({ src: '' }, 'src:' + sel.id),
                  },
                  t('inspector.removeImage'),
                )
              : null,
          ),
        )
      : null,
    info.hasColor || info.hasText
      ? colorRow(
          sel.props.color,
          (v) => applyProps({ color: v }, 'color:' + sel.id),
          t('inspector.color'),
        )
      : null,
    info.hasFont
      ? h(
          'div',
          null,
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.fontSize')),
            numInput(sel.props.fontSize || 14, (v) => applyProps({ fontSize: v }, 'fs:' + sel.id)),
          ),
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.fontWeight')),
            h(
              'select',
              {
                className: 'dpd-select',
                style: { flex: 1 },
                value: String(sel.props.fontWeight || 400),
                onChange: (e) => applyProps({ fontWeight: Number(e.target.value) }, 'fw:' + sel.id),
              },
              [400, 500, 600, 700].map((w) => h('option', { key: w, value: String(w) }, String(w))),
            ),
          ),
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.textAlign')),
            h(
              'select',
              {
                className: 'dpd-select',
                style: { flex: 1 },
                value: sel.props.textAlign || 'left',
                onChange: (e) => applyProps({ textAlign: e.target.value }, 'ta:' + sel.id),
              },
              ['left', 'center', 'right'].map((v) => h('option', { key: v, value: v }, v)),
            ),
          ),
        )
      : null,
    sel.type === 'container' || sel.type === 'group'
      ? h(
          'div',
          { className: 'dpd-section' },
          h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.container'))),
          sel.type === 'container'
            ? h(
                'div',
                { className: 'dpd-row' },
                h('label', null, t('inspector.background')),
                h('input', {
                  className: 'dpd-color',
                  type: 'color',
                  value: sel.props.background || '#ffffff',
                  onChange: (e) => applyProps({ background: e.target.value }, 'cbg:' + sel.id),
                }),
                h('input', {
                  className: 'dpd-input',
                  type: 'text',
                  value: sel.props.background || '#ffffff',
                  onChange: (e) => applyProps({ background: e.target.value }, 'cbg:' + sel.id),
                }),
              )
            : null,
          sel.type === 'container'
            ? h(
                'label',
                { className: 'dpd-checkRow' },
                h('input', {
                  type: 'checkbox',
                  checked: sel.props.clipContent !== false,
                  onChange: (e) => applyProps({ clipContent: e.target.checked }, 'clip:' + sel.id),
                }),
                t('inspector.clipContent'),
              )
            : null,
        )
      : null,
    h(
      'div',
      { className: 'dpd-section' },
      h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.constraints'))),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.constraintH')),
        h(
          'select',
          {
            className: 'dpd-select',
            style: { flex: 1 },
            title: t('inspector.constraintH'),
            value: (sel.constraints && sel.constraints.h) || 'left',
            onChange: (e) =>
              applyAttrs({
                constraints: { ...(sel.constraints || {}), h: e.target.value },
              }),
          },
          H_MODES.map((mode) => h('option', { key: mode, value: mode }, t('constraint.' + mode))),
        ),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.constraintV')),
        h(
          'select',
          {
            className: 'dpd-select',
            style: { flex: 1 },
            title: t('inspector.constraintV'),
            value: (sel.constraints && sel.constraints.v) || 'top',
            onChange: (e) =>
              applyAttrs({
                constraints: { ...(sel.constraints || {}), v: e.target.value },
              }),
          },
          V_MODES.map((mode) => h('option', { key: mode, value: mode }, t('constraint.' + mode))),
        ),
      ),
    ),
    isContainerType(sel.type)
      ? h(
          'div',
          { className: 'dpd-section' },
          h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.layout'))),
          h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.layoutDirection')),
            h(
              'select',
              {
                className: 'dpd-select',
                style: { flex: 1 },
                title: t('inspector.layoutDirection'),
                value: (sel.layout && sel.layout.direction) || 'none',
                onChange: (e) => {
                  const value = e.target.value;
                  applyAttrs({
                    layout:
                      value === 'none'
                        ? null
                        : {
                            ...(sel.layout || {}),
                            mode: 'stack',
                            direction: value,
                            gap: (sel.layout && sel.layout.gap) || 8,
                            padding: (sel.layout && sel.layout.padding) || 0,
                            align: (sel.layout && sel.layout.align) || 'start',
                            justify: (sel.layout && sel.layout.justify) || 'start',
                          },
                  });
                },
              },
              [
                h('option', { key: 'none', value: 'none' }, t('layout.none')),
                h('option', { key: 'column', value: 'column' }, t('layout.column')),
                h('option', { key: 'row', value: 'row' }, t('layout.row')),
              ],
            ),
          ),
          sel.layout
            ? h(
                'div',
                null,
                h(
                  'div',
                  { className: 'dpd-row' },
                  h('label', null, t('inspector.gap')),
                  numInput(sel.layout.gap || 0, (v) =>
                    applyAttrs({ layout: { ...sel.layout, gap: Math.max(0, v) } }, 'gap:' + sel.id),
                  ),
                ),
                h(
                  'div',
                  { className: 'dpd-row' },
                  h('label', null, t('inspector.padding')),
                  h(
                    'div',
                    { className: 'dpd-numPair' },
                    ['t', 'r', 'b', 'l'].map((side) =>
                      h(
                        'div',
                        { className: 'dpd-field', key: side },
                        h('span', null, side.toUpperCase()),
                        numInput((sel.layout.padding && sel.layout.padding[side]) || 0, (v) =>
                          applyAttrs(
                            {
                              layout: {
                                ...sel.layout,
                                padding: {
                                  ...(sel.layout.padding || {}),
                                  [side]: Math.max(0, v),
                                },
                              },
                            },
                            'pad:' + side + ':' + sel.id,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'dpd-row' },
                  h('label', null, t('inspector.layoutAlign')),
                  h(
                    'select',
                    {
                      className: 'dpd-select',
                      style: { flex: 1 },
                      title: t('inspector.layoutAlign'),
                      value: sel.layout.align || 'start',
                      onChange: (e) =>
                        applyAttrs({ layout: { ...sel.layout, align: e.target.value } }),
                    },
                    ['start', 'center', 'end', 'stretch'].map((mode) =>
                      h('option', { key: mode, value: mode }, t('layout.align.' + mode)),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'dpd-row' },
                  h('label', null, t('inspector.justify')),
                  h(
                    'select',
                    {
                      className: 'dpd-select',
                      style: { flex: 1 },
                      title: t('inspector.justify'),
                      value: sel.layout.justify || 'start',
                      onChange: (e) =>
                        applyAttrs({ layout: { ...sel.layout, justify: e.target.value } }),
                    },
                    ['start', 'center', 'end', 'between'].map((mode) =>
                      h('option', { key: mode, value: mode }, t('layout.justify.' + mode)),
                    ),
                  ),
                ),
              )
            : null,
        )
      : null,
    h(
      'div',
      { className: 'dpd-row' },
      h('label', null, t('inspector.radius')),
      numInput(sel.props.radius != null ? sel.props.radius : 8, (v) =>
        applyProps({ radius: v }, 'radius:' + sel.id),
      ),
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
        value: Math.round((sel.opacity == null ? 1 : sel.opacity) * 100),
        onChange: (e) => {
          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
          applyAttrs({ opacity: v / 100 }, 'opacity:' + sel.id);
        },
      }),
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
              onClick: () => applyAttrs({ state: s }),
            },
            t('stateName.' + s),
          ),
        ),
      ),
    ),
    h(
      'div',
      { className: 'dpd-section' },
      h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.interactions'))),
      interactions.length === 0
        ? h('div', { className: 'dpd-hint' }, t('inspector.noInteractions'))
        : interactions.map((item, i) =>
            h(
              'div',
              { className: 'dpd-interRow', key: 'inter-' + i },
              h(
                'select',
                {
                  className: 'dpd-select',
                  value: item.action,
                  onChange: (e) => {
                    const next = interactions.slice();
                    const action = e.target.value;
                    next[i] = {
                      trigger: 'click',
                      action,
                      ...(action === 'back' ? {} : { targetPageId: item.targetPageId || '' }),
                    };
                    applyAttrs({ interactions: next });
                  },
                },
                ['navigate', 'back', 'openOverlay'].map((a) =>
                  h('option', { key: a, value: a }, t('inspector.action.' + a)),
                ),
              ),
              item.action === 'back'
                ? null
                : h(
                    'select',
                    {
                      className: 'dpd-select',
                      value: item.targetPageId || '',
                      onChange: (e) => {
                        const next = interactions.slice();
                        next[i] = { ...item, targetPageId: e.target.value };
                        applyAttrs({ interactions: next });
                      },
                    },
                    [h('option', { key: '', value: '' }, '—')].concat(
                      pages.map((p) => h('option', { key: p.id, value: p.id }, p.name)),
                    ),
                  ),
              h(
                'button',
                {
                  className: 'dpd-mini',
                  type: 'button',
                  title: t('inspector.removeInteraction'),
                  onClick: () =>
                    applyAttrs({ interactions: interactions.filter((_, j) => j !== i) }),
                },
                '×',
              ),
            ),
          ),
      h(
        'div',
        { className: 'dpd-actions' },
        h(
          'button',
          {
            className: 'dpd-btn',
            type: 'button',
            onClick: () => {
              const target = pages.find((p) => p.id !== activePage.id) || activePage;
              applyAttrs({
                interactions: [
                  ...interactions,
                  { trigger: 'click', action: 'navigate', targetPageId: target.id },
                ],
              });
            },
          },
          t('inspector.addInteraction'),
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
      sel.type === 'group'
        ? h(
            'button',
            { className: 'dpd-btn', type: 'button', onClick: ungroupSelection },
            t('inspector.ungroup'),
          )
        : null,
      h(
        'button',
        { className: 'dpd-btn', type: 'button', onClick: deleteEl },
        h(IconTrash),
        t('inspector.delete'),
      ),
    ),
  );
}
