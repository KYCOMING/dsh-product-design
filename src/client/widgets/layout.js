import { radiusOf } from '../../shared/element-visual.js';
import { rgba } from '../color.js';
import { h } from '../react.js';

export function renderContainer(el, state, t, opts) {
  const p = el.props || {};
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        borderRadius: el.type === 'container' ? radiusOf(el) : 0,
        border:
          el.type === 'container'
            ? '1.5px dashed rgba(99,102,241,.45)'
            : '1px dashed rgba(107,114,128,.45)',
        background:
          el.type === 'container' ? p.background || 'rgba(255,255,255,.6)' : 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        padding: 8,
        overflow: 'hidden',
      },
    },
    h(
      'span',
      {
        style: {
          fontSize: 11,
          color: '#6b7280',
          background: 'rgba(255,255,255,.85)',
          borderRadius: 4,
          padding: '1px 4px',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
      p.name || t('comp.' + el.type),
    ),
  );
}
