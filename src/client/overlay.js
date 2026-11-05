import { Svg } from './icons.js';
import { h } from './react.js';

// ------------------------------------------------------------------
// page-state overlay (copy is editable per page via page.states)
// ------------------------------------------------------------------
function textOr(value, fallback) {
  return value && value.trim() ? value : fallback;
}

function OverlayAction(props) {
  return h(
    'div',
    {
      style: {
        marginTop: 4,
        padding: '7px 14px',
        borderRadius: 8,
        background: '#6366f1',
        color: '#fff',
        fontSize: 12.5,
        fontWeight: 600,
      },
    },
    props.label,
  );
}

function PageOverlay(props) {
  const { pageState, content, t } = props;
  const c = content || {};
  if (pageState === 'loading') {
    return h(
      'div',
      { className: 'dpd-overlay' },
      h('div', { className: 'dpd-spinner' }),
      h('div', { className: 'dpd-overlayDesc' }, textOr(c.text, t('overlay.loading'))),
    );
  }
  if (pageState === 'empty') {
    return h(
      'div',
      { className: 'dpd-overlay' },
      h(
        Svg,
        { size: 44, strokeWidth: 1.3, style: { color: '#b8bdc9' } },
        h('rect', { x: 2, y: 2, width: 12, height: 12, rx: 2.5 }),
        h('path', { d: 'M5 8h6M8 5v6' }),
      ),
      h('div', { className: 'dpd-overlayTitle' }, textOr(c.title, t('overlay.emptyTitle'))),
      h('div', { className: 'dpd-overlayDesc' }, textOr(c.desc, t('overlay.emptyDesc'))),
      h(OverlayAction, { label: textOr(c.action, t('overlay.emptyBtn')) }),
    );
  }
  if (pageState === 'error') {
    return h(
      'div',
      { className: 'dpd-overlay' },
      h(
        Svg,
        { size: 44, strokeWidth: 1.3, style: { color: '#e5484d' } },
        h('circle', { cx: 8, cy: 8, r: 6 }),
        h('path', { d: 'M8 5v4M8 11h.01' }),
      ),
      h('div', { className: 'dpd-overlayTitle' }, textOr(c.title, t('overlay.errorTitle'))),
      h('div', { className: 'dpd-overlayDesc' }, textOr(c.desc, t('overlay.errorDesc'))),
      h(OverlayAction, { label: textOr(c.action, t('overlay.errorBtn')) }),
    );
  }
  return null;
}

export { PageOverlay };
