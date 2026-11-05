import { h } from '../react.js';

/** Floating right-click menu, positioned in viewport coordinates. */
export function ContextMenu(props) {
  const { x, y, items, onClose } = props;
  return h(
    'div',
    {
      className: 'dpd-ctxmenu',
      style: {
        left: Math.max(4, Math.min(x, (window.innerWidth || 1200) - 200)),
        top: Math.max(4, Math.min(y, (window.innerHeight || 800) - 380)),
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
