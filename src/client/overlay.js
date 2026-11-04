import { Svg } from './icons.js';
import { h } from './react.js';

// ------------------------------------------------------------------
// page-state overlay
// ------------------------------------------------------------------
function PageOverlay(props) {
  const { pageState, t } = props;
  if (pageState === 'loading') {
    return h(
      'div',
      { className: 'dpd-overlay' },
      h('div', { className: 'dpd-spinner' }),
      h('div', { className: 'dpd-overlayDesc' }, t('overlay.loading')),
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
      h('div', { className: 'dpd-overlayTitle' }, t('overlay.emptyTitle')),
      h('div', { className: 'dpd-overlayDesc' }, t('overlay.emptyDesc')),
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
      h('div', { className: 'dpd-overlayTitle' }, t('overlay.errorTitle')),
      h('div', { className: 'dpd-overlayDesc' }, t('overlay.errorDesc')),
    );
  }
  return null;
}

export { PageOverlay };
