import { isContainerType } from '../shared/elements.js';
import {
  defaultConstraints,
  normalizeConstraints,
  normalizeLayout,
  reflowPage,
} from '../shared/layout.js';
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

function emptyStates() {
  return {
    loading: { text: '' },
    empty: { title: '', desc: '', action: '' },
    error: { title: '', desc: '', action: '' },
  };
}

function starterElements(t) {
  return [
    makeEl('navbar', 0, 0, 390, 56),
    makeEl('text', 24, 84, 320, 30, { fontSize: 22, text: t ? t('sample.welcome') : '欢迎回来' }),
    makeEl('text', 24, 120, 320, 22, {
      fontSize: 13,
      fontWeight: 400,
      color: '#6b7280',
      text: t ? t('sample.welcomeSub') : '今天想设计点什么？',
    }),
    makeEl('card', 24, 158, 342, 116),
    makeEl('input', 24, 296, 342, 44),
    makeEl('button', 24, 356, 150, 44),
    makeEl('toggle', 300, 364, 50, 28),
    makeEl('badge', 24, 420, 70, 24),
    makeEl('tabs', 0, 470, 390, 48),
    makeEl('image', 24, 540, 342, 160),
  ];
}

function defaultDoc(t) {
  const page = {
    id: uid(),
    name: t ? t('pages.default') + ' 1' : 'Page 1',
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    states: emptyStates(),
    elements: starterElements(t),
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

function normalizeStates(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const pick = (key, fields) => {
    const value = src[key] && typeof src[key] === 'object' ? src[key] : {};
    const out = {};
    for (const field of fields) out[field] = typeof value[field] === 'string' ? value[field] : '';
    return out;
  };
  return {
    loading: pick('loading', ['text']),
    empty: pick('empty', ['title', 'desc', 'action']),
    error: pick('error', ['title', 'desc', 'action']),
  };
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
      return {
        id: p.id || uid(),
        name: p.name || 'Page',
        frame: {
          w: fr.w || 390,
          h: fr.h || 844,
          preset: fr.preset || 'mobile',
          background: fr.background || '#ffffff',
        },
        states: normalizeStates(p.states),
        elements: normalizeElements(p.elements),
      };
    });
  if (!pages.length) return null;
  const activePageId = pages.some((p) => p.id === doc.activePageId)
    ? doc.activePageId
    : pages[0].id;
  return { name: doc.name || '', pages: pages.map(reflowPage), activePageId };
}

function docStorageKey(sessionId) {
  return sessionId ? `${STORAGE_KEY}:${sessionId}` : STORAGE_KEY;
}

function loadDoc(sessionId) {
  try {
    const raw = window.localStorage.getItem(docStorageKey(sessionId));
    if (!raw) return null;
    return normalizeDoc(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

function saveDoc(doc, sessionId) {
  try {
    window.localStorage.setItem(docStorageKey(sessionId), JSON.stringify(doc));
  } catch (e) {
    /* quota / private mode: ignore */
  }
}

function loadUi() {
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (e) {
    return {};
  }
}

function saveUi(ui) {
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch (e) {
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
  } catch (e) {
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
    } catch (e) {
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
          } catch (e) {
            body = null;
          }
        }
        return { status: res.status, body };
      }),
    () => null,
  );
}

export {
  apiFetch,
  defaultDoc,
  emptyStates,
  loadDoc,
  loadUi,
  makeEl,
  normalizeDoc,
  normalizeElement,
  normalizeElements,
  normalizeStates,
  saveDoc,
  saveUi,
  starterElements,
  uid,
};
