import { PANEL_ID } from './constants.js';
import { h } from './react.js';

// ------------------------------------------------------------------
// small inline chrome icons
// ------------------------------------------------------------------
function Svg(props) {
  const { size, children, ...rest } = props;
  return h(
    'svg',
    Object.assign(
      {
        width: size || 14,
        height: size || 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      rest,
    ),
    children,
  );
}
const IconPlus = () => h(Svg, null, h('path', { d: 'M8 3v10M3 8h10' }));
const IconMinus = () => h(Svg, null, h('path', { d: 'M3 8h10' }));
const IconEye = () =>
  h(
    Svg,
    null,
    h('path', { d: 'M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z' }),
    h('circle', { cx: 8, cy: 8, r: 1.8 }),
  );
const IconPencil = () => h(Svg, null, h('path', { d: 'M11 2.5l2.5 2.5L5 13.5 2 14l.5-3L11 2.5z' }));
const IconReset = () => h(Svg, null, h('path', { d: 'M3 8a5 5 0 1 0 1.6-3.7M3 3.2V6h2.8' }));
const IconTrash = () => h(Svg, null, h('path', { d: 'M2.5 4h11M6 4V2.5h4V4M4 4l.6 9h6.8L12 4' }));
const IconCopy = () =>
  h(
    Svg,
    null,
    h('rect', { x: 5, y: 5, width: 8, height: 8, rx: 1.4 }),
    h('path', { d: 'M3 11V4a1 1 0 0 1 1-1h7' }),
  );
const IconFront = () =>
  h(
    Svg,
    null,
    h('rect', { x: 3, y: 3, width: 8, height: 8, rx: 1.2 }),
    h('path', { d: 'M8 8h5v5' }),
  );
const IconBack = () =>
  h(
    Svg,
    null,
    h('rect', { x: 5, y: 5, width: 8, height: 8, rx: 1.2 }),
    h('path', { d: 'M3 8V3h5' }),
  );
const IconUndo = () => h(Svg, null, h('path', { d: 'M3.2 8.4a5 5 0 1 1 1.5 3.3M3 4.6V8h3.4' }));
const IconRedo = () => h(Svg, null, h('path', { d: 'M12.8 8.4a5 5 0 1 0-1.5 3.3M13 4.6V8H9.6' }));
const IconPages = () =>
  h(
    Svg,
    null,
    h('rect', { x: 3, y: 1.8, width: 10, height: 12.4, rx: 1.6 }),
    h('path', { d: 'M3 5.2h10M5.4 8.2h5.2M5.4 10.8h3.4' }),
  );
const IconComponents = () =>
  h(
    Svg,
    null,
    h('rect', { x: 2, y: 2, width: 5, height: 5, rx: 1 }),
    h('rect', { x: 9, y: 2, width: 5, height: 5, rx: 1 }),
    h('rect', { x: 2, y: 9, width: 5, height: 5, rx: 1 }),
    h('rect', { x: 9, y: 9, width: 5, height: 5, rx: 1 }),
  );
const IconLayers = () =>
  h(
    Svg,
    null,
    h('path', { d: 'M8 2l6 3-6 3-6-3 6-3z' }),
    h('path', { d: 'M2 8l6 3 6-3M2 11l6 3 6-3' }),
  );

function libGlyph(type) {
  const map = {
    button: h('rect', { x: 2, y: 5, width: 12, height: 6, rx: 2 }),
    input: h('rect', { x: 2, y: 4.5, width: 12, height: 7, rx: 1.6 }),
    card: h('rect', { x: 2, y: 3, width: 12, height: 10, rx: 1.6 }),
    navbar: h('path', { d: 'M2 4h12M2 4v8h12V4M6 7h4' }),
    tabs: h('path', { d: 'M2 5h12M5 5v6M10 5v6' }),
    toggle: h('rect', { x: 2, y: 5, width: 12, height: 6, rx: 3 }),
    checkbox: h('rect', { x: 3, y: 3, width: 10, height: 10, rx: 2 }),
    avatar: h('circle', { cx: 8, cy: 8, r: 5 }),
    text: h('path', { d: 'M3 4h10M8 4v8M5.5 12h5' }),
    image: h('rect', { x: 2, y: 3, width: 12, height: 10, rx: 1.6 }),
    badge: h('rect', { x: 2, y: 6, width: 12, height: 4, rx: 2 }),
    select: h('path', { d: 'M2 4.5h12v7H2zM10 8l1.5 1.5L13 8' }),
  };
  return map[type] || map.text;
}

// ------------------------------------------------------------------
// sidebar panel glyph
// ------------------------------------------------------------------
function ProductDesignIcon(props) {
  const size = props && props.size;
  return h(
    'svg',
    {
      viewBox: '0 0 16 16',
      width: size || 16,
      height: size || 16,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      'data-dsh-panel-entry': PANEL_ID,
    },
    h('rect', { x: 1.5, y: 2, width: 13, height: 11.5, rx: 2 }),
    h('path', { d: 'M1.5 5.4h13' }),
    h('rect', { x: 3.6, y: 8, width: 4, height: 3.2, rx: 0.6 }),
    h('circle', { cx: 10.6, cy: 9.6, r: 1.4 }),
  );
}

export {
  IconBack,
  IconComponents,
  IconCopy,
  IconEye,
  IconFront,
  IconLayers,
  IconMinus,
  IconPages,
  IconPencil,
  IconPlus,
  IconRedo,
  IconReset,
  IconTrash,
  IconUndo,
  libGlyph,
  ProductDesignIcon,
  Svg,
};
