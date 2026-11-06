import { accentOf, radiusOf } from '../../shared/element-visual.js';
import { rgba, shade } from '../color.js';
import { h } from '../react.js';

export function renderCard(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
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
        borderRadius: radiusOf(el),
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

export function renderNavbar(el, state, t, opts) {
  const p = el.props || {};
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

export function renderTabs(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
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

export function renderAvatar(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
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

export function renderBadge(el, state, t, opts) {
  const p = el.props || {};
  const acc = accentOf(el);
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
