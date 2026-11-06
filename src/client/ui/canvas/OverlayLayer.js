import { h } from '../../react.js';

/** Modal / dialog prototype: a target page rendered on top of the current one. */
export function OverlayLayer(props) {
  const { page, renderElements, onClose, viewport } = props;
  const frame = page.frame || { w: 390, h: 844 };
  const vh = viewport ? viewport.h : 900;
  const vw = viewport ? viewport.w : 1200;
  const scale = Math.min(1, (vh * 0.8) / Math.max(1, frame.h), (vw * 0.6) / Math.max(1, frame.w));
  return h(
    'div',
    { className: 'dpd-overlayBackdrop', onMouseDown: onClose },
    h(
      'div',
      {
        className: 'dpd-overlayFrame',
        style: {
          width: Math.round(frame.w * scale),
          height: Math.round(frame.h * scale),
          background: frame.background || '#ffffff',
        },
        onMouseDown: (ev) => ev.stopPropagation(),
        onClick: (ev) => ev.stopPropagation(),
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
          },
        },
        renderElements(page.elements || [], page.id, true),
      ),
    ),
  );
}
