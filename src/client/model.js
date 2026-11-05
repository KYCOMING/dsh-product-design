import { isContainerType } from '../shared/elements.js';
import {
  defaultConstraints,
  normalizeConstraints,
  normalizeLayout,
  reflowPage,
} from '../shared/layout.js';
import { normalizeStateLinks, PAGE_STATE_KEYS, repairPageStates } from '../shared/page-states.js';
import { API_PREFIX, defaultState, STORAGE_KEY, TYPE_INFO, UI_KEY } from './constants.js';

// ------------------------------------------------------------------
// document model + persistence
// ------------------------------------------------------------------
let __seq = 1;
function uid() {
  return 'e' + Date.now().toString(36) + (__seq++).toString(36);
}
function makeEl(type, x, y, w, hh, props, state) {
  const el = {
    id: uid(),
    type,
    name: '',
    x,
    y,
    w,
    h: hh,
    hidden: false,
    locked: false,
    opacity: 1,
    state: state || defaultState(type),
    props: props || {},
    interactions: [],
    constraints: defaultConstraints(type),
  };
  if (isContainerType(type)) {
    el.layout = null;
    el.children = [];
  }
  return el;
}

function defaultDoc(t) {
  // A brand-new design starts as a single blank page: an empty artboard the
  // user (or the agent) fills from the component library. We deliberately seed
  // no sample content so opening product design never shows a welcome/demo page.
  const page = {
    id: uid(),
    name: t ? t('pages.default') + ' 1' : 'Page 1',
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    states: {},
    elements: [],
  };
  return { name: '', pages: [page], activePageId: page.id };
}

function normalizeInteractions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    if (!['navigate', 'back', 'openOverlay'].includes(item.action)) continue;
    const next = { trigger: 'click', action: item.action };
    if (item.action !== 'back') next.targetPageId = String(item.targetPageId || '');
    out.push(next);
  }
  return out;
}

function normalizeElement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = TYPE_INFO[raw.type] ? raw.type : 'text';
  const el = {
    id: raw.id || uid(),
    type,
    name: typeof raw.name === 'string' ? raw.name : '',
    x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0,
    y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0,
    w: Math.max(12, Number.isFinite(Number(raw.w)) ? Number(raw.w) : TYPE_INFO[type].size[0]),
    h: Math.max(8, Number.isFinite(Number(raw.h)) ? Number(raw.h) : TYPE_INFO[type].size[1]),
    hidden: raw.hidden === true,
    locked: raw.locked === true,
    opacity: Number.isFinite(Number(raw.opacity))
      ? Math.max(0, Math.min(1, Number(raw.opacity)))
      : 1,
    state: raw.state || defaultState(type),
    props: raw.props && typeof raw.props === 'object' ? { ...raw.props } : {},
    interactions: normalizeInteractions(raw.interactions),
    constraints: normalizeConstraints(raw.constraints, type),
  };
  if (isContainerType(type)) {
    el.layout = normalizeLayout(raw.layout);
    el.children = Array.isArray(raw.children)
      ? raw.children.map(normalizeElement).filter(Boolean)
      : [];
  }
  return el;
}

function normalizeElements(list) {
  return Array.isArray(list) ? list.map(normalizeElement).filter(Boolean) : [];
}

function normalizeDoc(doc) {
  if (!doc || !Array.isArray(doc.pages)) return null;
  const pages = doc.pages
    .filter((p) => p && Array.isArray(p.elements))
    .map((p) => {
      const fr = p.frame || {};
      const page = {
        id: p.id || uid(),
        name: p.name || 'Page',
        frame: {
          w: fr.w || 390,
          h: fr.h || 844,
          preset: fr.preset || 'mobile',
          background: fr.background || '#ffffff',
        },
        states: normalizeStateLinks(p.states),
        elements: normalizeElements(p.elements),
      };
      if (p.variantOf && PAGE_STATE_KEYS.includes(p.stateKey)) {
        page.variantOf = p.variantOf;
        page.stateKey = p.stateKey;
      }
      return page;
    });
  if (!pages.length) return null;
  const out = {
    name: doc.name || '',
    pages: pages.map(reflowPage),
    activePageId: pages.some((p) => p.id === doc.activePageId) ? doc.activePageId : pages[0].id,
  };
  repairPageStates(out);
  if (!out.pages.some((p) => p.id === out.activePageId)) out.activePageId = out.pages[0].id;
  return out;
}

function docStorageKey(sessionId) {
  return sessionId ? `${STORAGE_KEY}:${sessionId}` : STORAGE_KEY;
}

function loadDoc(sessionId) {
  try {
    const raw = window.localStorage.getItem(docStorageKey(sessionId));
    if (!raw) return null;
    return normalizeDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveDoc(doc, sessionId) {
  try {
    window.localStorage.setItem(docStorageKey(sessionId), JSON.stringify(doc));
  } catch {
    /* quota / private mode: ignore */
  }
}

function loadUi() {
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

function saveUi(ui) {
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

/**
 * Call the Host document API. Returns `{ status, body }`, or `null` when the
 * Host half is not reachable (standalone/localStorage-only mode).
 */
function apiFetch(path, init, sessionId) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  let target = API_PREFIX + path;
  if (sessionId) {
    target += (target.includes('?') ? '&' : '?') + 'sessionId=' + encodeURIComponent(sessionId);
  }
  let url;
  try {
    url = new URL(
      target,
      window.location && window.location.href ? window.location.href : 'http://localhost/',
    ).toString();
  } catch {
    return Promise.resolve(null);
  }
  const opts = Object.assign({}, init);
  if (
    !opts.signal &&
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    try {
      opts.signal = AbortSignal.timeout(4000);
    } catch {
      /* ignore */
    }
  }
  return fetch(url, opts).then(
    (res) =>
      res.text().then((text) => {
        let body = null;
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }
        }
        return { status: res.status, body };
      }),
    () => null,
  );
}

export { apiFetch, defaultDoc, loadDoc, loadUi, makeEl, normalizeDoc, saveDoc, saveUi, uid };
