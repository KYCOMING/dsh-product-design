const NS = 'dsh-product-design';
const PANEL_ID = 'dsh-product-design';
const STORAGE_KEY = 'dsh-product-design:doc:v3';
const UI_KEY = 'dsh-product-design:ui:v1';
/** Host half's same-origin API (see index.js). The browser is a view over it. */
const API_PREFIX = '/dsh-product-design/api';
// ------------------------------------------------------------------
// component registry
// ------------------------------------------------------------------
const ACCENT = '#6366f1';
const TYPE_INFO = {
  container: {
    size: [320, 240],
    states: ['default'],
    hasText: false,
    hasColor: false,
    interactive: false,
    container: true,
  },
  group: {
    size: [200, 120],
    states: ['default'],
    hasText: false,
    hasColor: false,
    interactive: false,
    container: true,
  },
  button: {
    size: [132, 44],
    states: ['default', 'hover', 'active', 'disabled'],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: true,
  },
  input: {
    size: [260, 44],
    states: ['default', 'focus', 'filled', 'error', 'disabled'],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: true,
  },
  card: {
    size: [300, 120],
    states: ['default', 'hover'],
    hasText: true,
    hasColor: true,
    interactive: true,
  },
  navbar: { size: [390, 56], states: ['default'], hasText: true, interactive: false },
  tabs: { size: [390, 48], states: ['default'], hasText: true, hasColor: true, interactive: true },
  toggle: { size: [48, 28], states: ['on', 'off'], hasColor: true, interactive: true },
  checkbox: {
    size: [130, 24],
    states: ['unchecked', 'checked'],
    hasText: true,
    hasColor: true,
    interactive: true,
  },
  avatar: {
    size: [56, 56],
    states: ['default'],
    hasText: true,
    hasColor: true,
    interactive: false,
  },
  text: {
    size: [200, 30],
    states: ['default'],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: false,
  },
  image: { size: [300, 160], states: ['default'], hasColor: true, interactive: false },
  badge: { size: [64, 24], states: ['default'], hasText: true, hasColor: true, interactive: false },
  select: {
    size: [220, 44],
    states: ['default', 'open', 'disabled'],
    hasText: true,
    hasColor: true,
    interactive: true,
  },
};
const LIB_ORDER = [
  'container',
  'button',
  'input',
  'card',
  'navbar',
  'tabs',
  'toggle',
  'checkbox',
  'avatar',
  'text',
  'image',
  'badge',
  'select',
];

function defaultState(type) {
  if (type === 'toggle') return 'on';
  if (type === 'checkbox') return 'unchecked';
  return 'default';
}

export {
  ACCENT,
  API_PREFIX,
  defaultState,
  LIB_ORDER,
  NS,
  PANEL_ID,
  STORAGE_KEY,
  TYPE_INFO,
  UI_KEY,
};
