import { h } from '../react.js';

/** Floating right-click menu, positioned in viewport coordinates. */
export function ContextMenu(props) {
  const { x, y, items, onClose, viewport } = props;
  const vw = viewport ? viewport.w : 1200;
  const vh = viewport ? viewport.h : 800;
  return h(
    'div',
    {
      className: 'dpd-ctxmenu',
      style: {
        left: Math.max(4, Math.min(x, vw - 200)),
        top: Math.max(4, Math.min(y, vh - 380)),
      },
      onMouseDown: (e) => e.stopPropagation(),
      onContextMenu: (e) => e.preventDefault(),
    },
    items.map((item, index) =>
      item.sep
        ? h('div', { key: 'sep' + index, className: 'dpd-ctxsep' })
        : h(
            'button',
            {
              key: item.label + index,
              type: 'button',
              disabled: item.disabled,
              className: item.danger ? 'danger' : '',
              onClick: () => {
                onClose();
                item.onClick();
              },
            },
            h('span', null, item.label),
            item.key ? h('span', { className: 'k' }, item.key) : null,
          ),
    ),
  );
}
