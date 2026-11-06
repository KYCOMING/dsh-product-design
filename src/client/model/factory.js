/** Element factory + document normalization (client view). */
import { uid } from '../../shared/id.js';
import {
  emptyDoc,
  normalizeElement,
  normalizeDoc as schemaNormalizeDoc,
} from '../../shared/schema.js';

function makeEl(type, x, y, w, hh, props, state) {
  // Build through the canonical normalizer so new-element defaults can never
  // drift from the host's normalization.
  return normalizeElement({
    id: uid(),
    type,
    x,
    y,
    w,
    h: hh,
    state: state || undefined,
    props: props || {},
  });
}

function defaultDoc() {
  // A brand-new design starts empty — no pages. The user (or the agent) adds
  // the first page from the page list, so opening product design on a new
  // Session shows a blank canvas instead of an auto-created artboard.
  return emptyDoc();
}

function normalizeDoc(doc) {
  // Client view: empty documents return null so the caller knows to seed one,
  // and Auto Layout pages are reflowed locally. The host keeps empty docs and
  // reflows explicitly inside applyOps.
  return schemaNormalizeDoc(doc, { allowEmpty: false, reflow: true });
}

export { defaultDoc, makeEl, normalizeDoc };
