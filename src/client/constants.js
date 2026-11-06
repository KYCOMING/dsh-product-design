import { ACCENT } from '../shared/element-visual.js';
import { defaultState, ELEMENT_TYPES as TYPE_INFO } from '../shared/schema.js';

const NS = 'dsh-product-design';
const PANEL_ID = 'dsh-product-design';
const STORAGE_KEY = 'dsh-product-design:doc:v3';
const UI_KEY = 'dsh-product-design:ui:v1';
/** Host half's same-origin API (see index.js). The browser is a view over it. */
const API_PREFIX = '/dsh-product-design/api';
// Component registry (single source of truth lives in shared/schema.js):
// TYPE_INFO is re-exported so existing UI consumers stay unchanged.
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
