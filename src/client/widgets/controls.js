import { accentOf, fontSizeOf, radiusOf } from '../../shared/element-visual.js';
import { rgba, shade } from '../color.js';
import { h } from '../react.js';

export function renderButton(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
  let bg = acc;
  let fg = '#ffffff';
  let shadow = 'none';
  if (state === 'hover') bg = shade(acc, -0.08);
  else if (state === 'active') {
    bg = shade(acc, -0.16);
    shadow = 'inset 0 1px 3px rgba(0,0,0,.25)';
  } else if (state === 'disabled') {
    bg = '#c9ccd4';
    fg = '#f7f8fa';
  }
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: fg,
        borderRadius: radiusOf(el),
        fontWeight: 600,
        fontSize: fontSizeOf(el, 14),
        boxShadow: shadow,
        transition: 'background .15s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        padding: '0 12px',
      },
    },
    p.text || t('sample.button'),
  );
}

export function renderInput(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
  const focused = state === 'focus';
  const err = state === 'error';
  const dis = state === 'disabled';
  const border = err ? '#e5484d' : focused ? acc : '#d6d9e2';
  const bgc = dis ? '#f4f5f7' : '#ffffff';
  const showValue = state === 'filled';
  const txt = showValue ? p.text || t('sample.filled') : p.text || t('sample.placeholder');
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        boxSizing: 'border-box',
        border: '1.5px solid ' + border,
        borderRadius: radiusOf(el),
        background: bgc,
        color: showValue ? '#1a1d26' : '#9aa1ad',
        fontSize: fontSizeOf(el, 14),
        boxShadow: focused ? '0 0 0 3px ' + rgba(acc, 0.18) : 'none',
        transition: 'border-color .15s, box-shadow .15s',
        overflow: 'hidden',
      },
    },
    h(
      'span',
      { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      txt,
    ),
  );
}

export function renderSelect(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
  const open = state === 'open';
  const opts3 = [t('sample.opt1'), t('sample.opt2'), t('sample.opt3')];
  return h(
    'div',
    { style: { width: '100%', height: '100%', position: 'relative' } },
    h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          boxSizing: 'border-box',
          border: '1.5px solid ' + (open ? acc : '#d6d9e2'),
          borderRadius: 8,
          background: '#fff',
          fontSize: 14,
          color: '#333a45',
        },
      },
      h(
        'span',
        { style: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } },
        p.text || t('sample.select'),
      ),
      h(
        'svg',
        {
          width: 12,
          height: 12,
          viewBox: '0 0 12 12',
          fill: 'none',
          stroke: '#6b7280',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' },
        },
        h('path', { d: 'M2.5 4.5L6 8l3.5-3.5' }),
      ),
    ),
    open
      ? h(
          'div',
          {
            style: {
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #eceef3',
              borderRadius: 8,
              boxShadow: '0 10px 24px rgba(17,24,39,.14)',
              padding: 4,
              zIndex: 5,
            },
          },
          opts3.map((o, i) =>
            h(
              'div',
              {
                key: i,
                style: {
                  padding: '7px 10px',
                  fontSize: 13.5,
                  color: '#333a45',
                  borderRadius: 5,
                  background: i === 0 ? rgba(acc, 0.1) : 'transparent',
                },
              },
              o,
            ),
          ),
        )
      : null,
  );
}

export function renderToggle(el, state, t, opts) {
  const acc = accentOf(el);
  const on = state === 'on';
  const kn = Math.max(12, (el.h || 26) - 6);
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
        background: on ? acc : '#d5d8df',
        position: 'relative',
        transition: 'background .18s ease',
      },
    },
    h('div', {
      style: {
        position: 'absolute',
        top: 3,
        left: on ? 'calc(100% - ' + (kn + 3) + 'px)' : '3px',
        width: kn,
        height: kn,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        transition: 'left .18s ease',
      },
    }),
  );
}

export function renderCheckbox(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
  const checked = state === 'checked';
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflow: 'hidden',
      },
    },
    h(
      'div',
      {
        style: {
          width: 20,
          height: 20,
          borderRadius: 5,
          background: checked ? acc : '#fff',
          border: checked ? '1.5px solid ' + acc : '1.5px solid #c9ccd4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all .15s',
        },
      },
      checked
        ? h(
            'svg',
            {
              width: 12,
              height: 12,
              viewBox: '0 0 12 12',
              fill: 'none',
              stroke: '#fff',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            },
            h('path', { d: 'M2 6l2.5 2.5L10 3' }),
          )
        : null,
    ),
    h(
      'span',
      {
        style: {
          fontSize: 13.5,
          color: '#333a45',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
      p.text || t('sample.checkbox'),
    ),
  );
}
