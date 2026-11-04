import { rgba, shade } from './color.js';
import { ACCENT } from './constants.js';
import { h } from './react.js';

function renderWidget(el, state, t, opts) {
  opts = opts || {};
  const p = el.props || {};
  const acc = p.color || ACCENT;

  if (el.type === 'button') {
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
          borderRadius: p.radius != null ? p.radius : 8,
          fontWeight: 600,
          fontSize: p.fontSize || 14,
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

  if (el.type === 'input') {
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
          borderRadius: p.radius != null ? p.radius : 8,
          background: bgc,
          color: showValue ? '#1a1d26' : '#9aa1ad',
          fontSize: p.fontSize || 14,
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

  if (el.type === 'card') {
    const hover = state === 'hover';
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          background: '#fff',
          border: '1px solid #eceef3',
          borderRadius: p.radius != null ? p.radius : 12,
          boxShadow: hover ? '0 10px 26px rgba(17,24,39,.14)' : '0 1px 3px rgba(17,24,39,.06)',
          transform: hover ? 'translateY(-2px)' : 'none',
          transition: 'all .18s ease',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflow: 'hidden',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 15,
            fontWeight: 600,
            color: '#161a22',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
        p.text || t('sample.card'),
      ),
      h(
        'div',
        { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, overflow: 'hidden' } },
        t('sample.cardSub'),
      ),
      h(
        'div',
        {
          style: {
            marginTop: 'auto',
            height: 6,
            background: '#eef0f5',
            borderRadius: 999,
            overflow: 'hidden',
          },
        },
        h('div', { style: { width: '62%', height: '100%', background: acc, borderRadius: 999 } }),
      ),
    );
  }

  if (el.type === 'navbar') {
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          boxSizing: 'border-box',
          background: '#fff',
          borderBottom: '1px solid #eceef3',
          gap: 8,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 16,
            fontWeight: 600,
            color: '#161a22',
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          },
        },
        p.text || t('sample.navbar'),
      ),
      h(
        'svg',
        { width: 18, height: 18, viewBox: '0 0 16 16', fill: '#6b7280' },
        h('circle', { cx: 3, cy: 8, r: 1.4 }),
        h('circle', { cx: 8, cy: 8, r: 1.4 }),
        h('circle', { cx: 13, cy: 8, r: 1.4 }),
      ),
    );
  }

  if (el.type === 'tabs') {
    const labels = (p.text || t('sample.tabs')).split(',').map((s) => s.trim());
    const activeIdx = opts.tabsActive != null ? opts.tabsActive : 0;
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid #eceef3',
          background: '#fff',
        },
      },
      labels.map((lb, i) =>
        h(
          'div',
          {
            key: i,
            style: {
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13.5,
              fontWeight: i === activeIdx ? 600 : 500,
              color: i === activeIdx ? acc : '#6b7280',
              borderBottom: i === activeIdx ? '2px solid ' + acc : '2px solid transparent',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            },
          },
          lb,
        ),
      ),
    );
  }

  if (el.type === 'toggle') {
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

  if (el.type === 'checkbox') {
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

  if (el.type === 'avatar') {
    const initial = (p.text || 'U').trim().slice(0, 2).toUpperCase();
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg,' + shade(acc, 0.15) + ',' + acc + ')',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 600,
          fontSize: Math.max(12, Math.round((el.h || 48) * 0.34)),
          overflow: 'hidden',
        },
      },
      initial,
    );
  }

  if (el.type === 'text') {
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          fontSize: p.fontSize || 18,
          fontWeight: p.fontWeight || 600,
          color: p.color || '#161a22',
          lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
        },
      },
      p.text || t('sample.text'),
    );
  }

  if (el.type === 'image') {
    return h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          borderRadius: p.radius != null ? p.radius : 10,
          background:
            'repeating-linear-gradient(45deg,#eef0f5,#eef0f5 10px,#e6e9f0 10px,#e6e9f0 20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e6e9f0',
          overflow: 'hidden',
        },
      },
      h(
        'svg',
        {
          width: '38%',
          height: '38%',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: '#b3b9c6',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
        h('circle', { cx: 8.5, cy: 9.5, r: 1.6 }),
        h('path', { d: 'M4 18l5-5 4 4 3-3 4 4' }),
      ),
    );
  }

  if (el.type === 'badge') {
    return h(
      'div',
      { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center' } },
      h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 10px',
            borderRadius: 999,
            background: rgba(acc, 0.14),
            color: shade(acc, -0.12),
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.03em',
          },
        },
        p.text || 'NEW',
      ),
    );
  }

  if (el.type === 'select') {
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

  return h('div', { style: { width: '100%', height: '100%' } });
}

export { renderWidget };
