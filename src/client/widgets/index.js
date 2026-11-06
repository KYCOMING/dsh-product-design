import { h } from '../react.js';
import { renderImage, renderText } from './content.js';
import {
  renderButton,
  renderCheckbox,
  renderInput,
  renderSelect,
  renderToggle,
} from './controls.js';
import { renderAvatar, renderBadge, renderCard, renderNavbar, renderTabs } from './display.js';
import { renderContainer } from './layout.js';

const RENDERERS = {
  container: renderContainer,
  group: renderContainer,
  button: renderButton,
  input: renderInput,
  card: renderCard,
  navbar: renderNavbar,
  tabs: renderTabs,
  toggle: renderToggle,
  checkbox: renderCheckbox,
  avatar: renderAvatar,
  text: renderText,
  image: renderImage,
  badge: renderBadge,
  select: renderSelect,
};

export function renderWidget(el, state, t, opts = {}) {
  const render = RENDERERS[el.type];
  return render
    ? render(el, state, t, opts)
    : h('div', { style: { width: '100%', height: '100%' } });
}
