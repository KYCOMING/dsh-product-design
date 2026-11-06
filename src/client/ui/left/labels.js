import { h } from '../../react.js';

export function LockGlyph(props) {
  const locked = props.locked;
  return h(
    'svg',
    {
      width: 13,
      height: 13,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    h('rect', { x: 3.5, y: 7, width: 9, height: 6.5, rx: 1.6 }),
    locked
      ? h('path', { d: 'M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7' })
      : h('path', { d: 'M5.5 7V5.4a2.5 2.5 0 0 1 4.7-1.2' }),
  );
}

export function layerLabel(el, t) {
  return el.name || el.props.text || el.props.name || t('comp.' + el.type);
}

export function docTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
