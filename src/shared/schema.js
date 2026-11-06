/**
 * Canonical document schema shared by the browser and host halves.
 *
 * Single source of truth for:
 *   - element type metadata (sizes, valid states, capabilities);
 *   - artboard presets;
 *   - interaction action whitelist;
 *   - element / page / document normalization.
 *
 * Both `src/client/model.js` (view model) and `src/host/model.js` (authoritative
 * reducer) call these instead of keeping private copies, so a new element field
 * or state is added once and can no longer silently drift across the process
 * boundary.
 */

import { isContainerType } from './elements.js';
import { newId } from './id.js';
import { normalizeConstraints, normalizeLayout, reflowPage } from './layout.js';
import { normalizeStateLinks, PAGE_STATE_KEYS, repairPageStates } from './page-states.js';

/** Element registry: size (default w/h), valid states, and UI capabilities. */
export const ELEMENT_TYPES = {
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

/** Artboard presets → [width, height]. */
export const PRESETS = {
  mobile: [390, 844],
  tablet: [768, 1024],
  desktop: [1280, 800],
};

/** Valid interaction actions. */
export const INTERACTION_ACTIONS = ['navigate', 'back', 'openOverlay'];

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v, d) => (typeof v === 'string' ? v : d);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function cloneVal(x) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(x);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(x));
}

/** Default interactive state for an element type. */
export function defaultState(type) {
  if (type === 'toggle') return 'on';
  if (type === 'checkbox') return 'unchecked';
  return 'default';
}

/** Normalize an interactions array to the canonical `{ trigger, action, targetPageId }`. */
export function normalizeInteractions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const action = INTERACTION_ACTIONS.includes(item.action) ? item.action : null;
    if (!action) continue;
    const next = { trigger: 'click', action };
    if (action !== 'back') next.targetPageId = str(item.targetPageId, '');
    out.push(next);
  }
  return out;
}

/** An empty document (no pages) — a brand-new design. */
export function emptyDoc() {
  return { name: '', pages: [], activePageId: null };
}

/**
 * Coerce a raw element into a valid one. Invalid `state` falls back to the
 * type default, unknown types become `text`, and dimensions are clamped.
 */
export function normalizeElement(raw, { elementId = () => newId('e') } = {}) {
  const e = isObj(raw) ? raw : {};
  const type = ELEMENT_TYPES[e.type] ? e.type : 'text';
  const [dw, dh] = ELEMENT_TYPES[type].size;
  const states = ELEMENT_TYPES[type].states || ['default'];
  const out = {
    id: str(e.id, '') || elementId(),
    type,
    name: str(e.name, ''),
    x: num(e.x, 0),
    y: num(e.y, 0),
    w: Math.max(12, num(e.w, dw)),
    h: Math.max(8, num(e.h, dh)),
    hidden: e.hidden === true,
    locked: e.locked === true,
    opacity: clamp01(num(e.opacity, 1)),
    state: states.includes(e.state) ? e.state : defaultState(type),
    props: isObj(e.props) ? cloneVal(e.props) : {},
    interactions: normalizeInteractions(e.interactions),
    constraints: normalizeConstraints(e.constraints, type),
  };
  if (isContainerType(type)) {
    out.layout = normalizeLayout(e.layout);
    out.children = Array.isArray(e.children)
      ? e.children.filter(isObj).map((child) => normalizeElement(child, { elementId }))
      : [];
  }
  return out;
}

/** Coerce a raw page. Variant pages keep their `variantOf`/`stateKey` link. */
export function normalizePage(
  raw,
  { elementId = () => newId('e'), pageId = () => newId('p') } = {},
) {
  const p = isObj(raw) ? raw : {};
  const frame = isObj(p.frame) ? p.frame : {};
  const preset = PRESETS[frame.preset] ? frame.preset : 'mobile';
  const size = PRESETS[preset];
  const out = {
    id: str(p.id, '') || pageId(),
    name: str(p.name, 'Page'),
    frame: {
      w: Math.max(1, num(frame.w, size[0])),
      h: Math.max(1, num(frame.h, size[1])),
      preset,
      background: str(frame.background, '#ffffff'),
    },
    states: {},
    elements: Array.isArray(p.elements)
      ? p.elements.filter(isObj).map((child) => normalizeElement(child, { elementId }))
      : [],
  };
  const variantOf = str(p.variantOf, '');
  const stateKey = PAGE_STATE_KEYS.includes(p.stateKey) ? p.stateKey : '';
  if (variantOf && stateKey) {
    out.variantOf = variantOf;
    out.stateKey = stateKey;
  } else {
    out.states = normalizeStateLinks(p.states);
  }
  return out;
}

/**
 * Coerce any stored/raw value into a valid document.
 *
 * @param {object} raw
 * @param {object} opts
 * @param {boolean} opts.allowEmpty  when false, an empty document returns `null`
 *   (the client uses this to detect "needs seeding"); the host keeps the empty doc.
 * @param {boolean} opts.reflow      reflow pages after normalizing (client view);
 *   the host reflows explicitly inside `applyOps` instead.
 */
export function normalizeDoc(raw, { allowEmpty = true, reflow = false, elementId, pageId } = {}) {
  if (!isObj(raw) || !Array.isArray(raw.pages)) return allowEmpty ? emptyDoc() : null;
  let pages = raw.pages.filter(isObj).map((p) => normalizePage(p, { elementId, pageId }));
  if (!allowEmpty && pages.length === 0) return null;
  if (reflow) pages = pages.map(reflowPage);
  const doc = { name: str(raw.name, ''), pages, activePageId: raw.activePageId };
  repairPageStates(doc);
  if (!doc.pages.some((p) => p.id === doc.activePageId)) {
    doc.activePageId = doc.pages.length ? doc.pages[0].id : null;
  }
  return doc;
}
