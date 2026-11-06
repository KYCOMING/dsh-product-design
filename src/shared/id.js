/**
 * Single source of truth for generated ids (client + host).
 *
 * `uid()` keeps the historical client format (`e` + time36 + counter36) so
 * existing persisted documents and tests are unaffected. `newId(prefix)` is the
 * generic form used by host/page-state code that needs an explicit prefix.
 */

let seq = 1;

function shortRandom() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

/** Client element/page id: `e` + timestamp36 + monotonically increasing counter36. */
export function uid() {
  return `e${Date.now().toString(36)}${(seq++).toString(36)}`;
}

/** Generic prefixed id: `prefix` + timestamp36 + counter36 + short random. */
export function newId(prefix = 'e') {
  return `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${shortRandom()}`;
}
