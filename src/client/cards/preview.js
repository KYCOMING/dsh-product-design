/** Compact read-only page thumbnail used by the card. */
import { isContainerType } from '../../shared/elements.js';
import { defaultState } from '../constants.js';
import { useT } from '../i18n.js';
import { h } from '../react.js';
import { renderWidget } from '../widgets.js';

function renderMiniElements(elements, t) {
  return (elements || []).map((el) => {
    if (el.hidden) return null;
    const isBox = isContainerType(el.type);
    const style = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.w,
      height: el.h,
      boxSizing: 'border-box',
      opacity: el.opacity == null ? 1 : el.opacity,
    };
    if (isBox && el.type === 'container') {
      style.background = (el.props && el.props.background) || '#ffffff';
      style.borderRadius = el.props && el.props.radius != null ? el.props.radius : 12;
      style.overflow = el.props && el.props.clipContent === false ? 'visible' : 'hidden';
    }
    return h(
      'div',
      { key: el.id, style },
      isBox
        ? renderMiniElements(el.children, t)
        : h(
            'div',
            { style: { width: '100%', height: '100%', pointerEvents: 'none' } },
            renderWidget(el, el.state || defaultState(el.type), t, {}),
          ),
    );
  });
}

/** Compact read-only preview of one page snapshot. */
export function ProductPagePreview(props) {
  const t = useT();
  const page = props.page;
  const frame = page.frame || { w: 390, h: 844, background: '#ffffff' };
  const maxW = props.maxWidth || 520;
  const maxH = props.maxHeight || 520;
  const scale = Math.min(maxW / Math.max(1, frame.w), maxH / Math.max(1, frame.h), 1);
  return h(
    'div',
    {
      style: {
        width: Math.max(1, Math.round(frame.w * scale)),
        height: Math.max(1, Math.round(frame.h * scale)),
        overflow: 'hidden',
        borderRadius: 12,
        background: frame.background || '#ffffff',
        boxShadow: '0 8px 28px rgba(17,24,39,.12), 0 0 0 1px rgba(17,24,39,.05)',
        flexShrink: 0,
      },
    },
    h(
      'div',
      {
        style: {
          width: frame.w,
          height: frame.h,
          position: 'relative',
          transform: 'scale(' + scale + ')',
          transformOrigin: 'top left',
          background: frame.background || '#ffffff',
        },
      },
      renderMiniElements(page.elements || [], t),
    ),
  );
}
