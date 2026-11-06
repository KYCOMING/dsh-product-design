import { fontSizeOf, radiusOf } from '../../shared/element-visual.js';
import { h } from '../react.js';

export function renderText(el, state, t, opts) {
  const p = el.props || {};
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        fontSize: fontSizeOf(el, 18),
        fontWeight: p.fontWeight || 600,
        color: p.color || '#161a22',
        textAlign: p.textAlign || 'left',
        lineHeight: 1.3,
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
      },
    },
    p.text || t('sample.text'),
  );
}

export function renderImage(el, state, t, opts) {
  const p = el.props || {};
  if (p.src) {
    return h('img', {
      src: p.src,
      alt: p.alt || '',
      draggable: false,
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: p.fit || 'cover',
        borderRadius: radiusOf(el),
        pointerEvents: 'none',
      },
    });
  }
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        borderRadius: radiusOf(el),
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
