import { API_PREFIX, defaultState, LEGACY_KEY, STORAGE_KEY, UI_KEY } from './constants.js';

// ------------------------------------------------------------------
// document model + persistence
// ------------------------------------------------------------------
let __seq = 1;
function uid() {
  return 'e' + Date.now().toString(36) + (__seq++).toString(36);
}
function makeEl(type, x, y, w, hh, props, state) {
  return {
    id: uid(),
    type,
    x,
    y,
    w,
    h: hh,
    state: state || defaultState(type),
    props: props || {},
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
    elements: starterElements(t),
  };
  return { name: '', pages: [page], activePageId: page.id };
}
function normalizeDoc(doc) {
  if (!doc) return null;
  if (Array.isArray(doc.pages) && doc.pages.length) {
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
          elements: p.elements,
        };
      });
    if (!pages.length) return null;
    const activePageId = pages.some((p) => p.id === doc.activePageId)
      ? doc.activePageId
      : pages[0].id;
    return { name: doc.name || '', pages, activePageId };
  }
  // v1 single-frame migration
  if (doc.frame && Array.isArray(doc.elements)) {
    const fr = doc.frame;
    const page = {
      id: uid(),
      name: 'Page 1',
      frame: {
        w: fr.w || 390,
        h: fr.h || 844,
        preset: fr.preset || 'mobile',
        background: fr.background || '#ffffff',
      },
      elements: doc.elements,
    };
    return { name: doc.name || '', pages: [page], activePageId: page.id };
  }
  return null;
}
function loadDoc() {
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return normalizeDoc(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}
function saveDoc(doc) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
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
function apiFetch(path, init) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  let url;
  try {
    url = new URL(
      API_PREFIX + path,
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
  loadDoc,
  loadUi,
  makeEl,
  normalizeDoc,
  saveDoc,
  saveUi,
  starterElements,
  uid,
};
