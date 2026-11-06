/**
 * Host-side document model for dsh-product-design.
 *
 * Pure functions only (no I/O, no Cordis, no DOM) so the same reducer can be
 * unit-tested in isolation and reused by the Host tools. The Host owns the
 * document and applies ordered operations; the browser panel is a view over it.
 *
 * Document shape:
 *   { name, activePageId, pages: [page] }
 *   page:    { id, name, frame: { w, h, preset, background }, states, elements }
 *   element: { id, type, name, x, y, w, h, hidden, locked, opacity, state, props, interactions }
 *
 * There is deliberately no legacy migration: the document format is versioned
 * by the storage key, and old shapes are simply not supported.
 */

import {
  collectElementEntries,
  findElementEntry,
  isContainerType,
  removeElementsFromTree,
} from '../shared/elements.js';
import { newId } from '../shared/id.js';
import { reflowPage } from '../shared/layout.js';
import { basePages, PAGE_STATE_KEYS, statePageId } from '../shared/page-states.js';
import {
  emptyDoc,
  normalizeElement,
  normalizePage,
  normalizeDoc as schemaNormalizeDoc,
} from '../shared/schema.js';
import { createArrangeHandlers } from './model/ops/arrange.js';
import { createElementsHandlers } from './model/ops/elements.js';
import { createPagesHandlers } from './model/ops/pages.js';

// ---- shared coercion helpers (used by the op reducer below) ----
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v, d) => (typeof v === 'string' ? v : d);

// Normalization is delegated to shared/schema.js so the client and host can
// never drift. The host keeps empty documents and does not reflow here
// (reflow happens explicitly inside applyOps).
const ensureElement = (raw) => normalizeElement(raw, { elementId: () => newId('e') });
const ensurePage = (raw) =>
  normalizePage(raw, { elementId: () => newId('e'), pageId: () => newId('p') });

/** Coerce any stored/raw value into a valid document (drops unknown junk). */
export function ensureDoc(raw) {
  return schemaNormalizeDoc(raw, {
    allowEmpty: true,
    reflow: false,
    elementId: () => newId('e'),
    pageId: () => newId('p'),
  });
}

export { emptyDoc };

function clone(x) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(x);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(x));
}

function findPage(doc, op, opIndex) {
  let page;
  if (op && op.pageId === '@last') {
    page = doc.pages[doc.pages.length - 1];
  } else if (op && typeof op.pageIndex === 'number' && Number.isFinite(op.pageIndex)) {
    page = doc.pages[op.pageIndex];
  } else if (op && op.pageId) {
    page = doc.pages.find((p) => p.id === op.pageId);
  } else {
    page = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  }
  if (!page) {
    const target = op && op.pageId !== undefined ? `"${op.pageId}"` : String(op && op.pageIndex);
    throw new Error(`op[${opIndex}] references unknown page ${target}; add a page first`);
  }
  return page;
}

/**
 * Ops that address existing elements default to the page that actually holds
 * them, so a model can edit by id without repeating the page id. Adding
 * something new still defaults to the active page.
 */
function findPageForElement(doc, op, index) {
  if (op.pageId !== undefined || typeof op.pageIndex === 'number') return findPage(doc, op, index);
  const ids = op.elementId ? [op.elementId] : Array.isArray(op.elementIds) ? op.elementIds : [];
  for (const id of ids) {
    const page = doc.pages.find((p) => !!findElementEntry(p.elements, id));
    if (page) return page;
  }
  return findPage(doc, op, index);
}

function requirePageById(doc, pageId, opIndex, label) {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`op[${opIndex}] ${label}: unknown page "${pageId}"`);
  return page;
}

function applyOne(doc, op, index, state) {
  if (!isObj(op)) throw new Error(`op[${index}] must be an object`);
  const kind = op.kind;
  const handler = OP_HANDLERS[kind];
  if (!handler) throw new Error(`op[${index}] has unknown kind "${kind}"`);
  return handler(doc, op, index, state);
}

const removeElementById = (elements, id) => removeElementsFromTree(elements, new Set([id]));

const DEPS = {
  findPage,
  findPageForElement,
  requirePageById,
  ensureElement,
  ensurePage,
  clone,
  isObj,
  num,
  str,
  removeElementById,
};
const OP_HANDLERS = {
  ...createPagesHandlers(DEPS),
  ...createElementsHandlers(DEPS),
  ...createArrangeHandlers(DEPS),
};

export function applyOps(rawDoc, ops) {
  if (!Array.isArray(ops)) throw new Error('operations must be an array');
  if (ops.length === 0) throw new Error('operations must not be empty');
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  const state = { lastContainerId: null };
  const results = ops.map((op, i) => applyOne(doc, op, i, state));
  doc.pages = doc.pages.map(reflowPage);
  if (!doc.activePageId && doc.pages.length) doc.activePageId = doc.pages[0].id;
  return { doc, results };
}

/** A short human/model-readable summary of a document (for tool output). */
export function summarizeDoc(rawDoc) {
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  return {
    name: doc.name,
    activePageId: doc.activePageId,
    pages: basePages(doc).map((p) => {
      const entries = collectElementEntries(p.elements);
      return {
        id: p.id,
        name: p.name,
        frame: `${p.frame.w}×${p.frame.h}`,
        elements: entries.length,
        containers: entries.filter((entry) => isContainerType(entry.el.type)).length,
        links: entries.filter((entry) => entry.el.interactions?.length).length,
        states: PAGE_STATE_KEYS.filter((key) => statePageId(doc, p.id, key)),
      };
    }),
    variants: doc.pages.length - basePages(doc).length,
  };
}
