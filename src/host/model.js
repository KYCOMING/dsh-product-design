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
  boundsOfEntries,
  cloneElementDeep,
  collectElementEntries,
  descendantIds,
  findElementEntry,
  isContainerType,
  reorderInTree,
} from '../shared/elements.js';
import { normalizeConstraints, normalizeLayout, reflowPage, resizePage } from '../shared/layout.js';

export const ELEMENT_TYPES = {
  container: [320, 240],
  group: [200, 120],
  button: [132, 44],
  input: [260, 44],
  card: [300, 120],
  navbar: [390, 56],
  tabs: [390, 48],
  toggle: [48, 28],
  checkbox: [130, 24],
  avatar: [56, 56],
  text: [200, 30],
  image: [300, 160],
  badge: [64, 24],
  select: [220, 44],
};

export const ELEMENT_STATES = {
  container: ['default'],
  group: ['default'],
  button: ['default', 'hover', 'active', 'disabled'],
  input: ['default', 'focus', 'filled', 'error', 'disabled'],
  card: ['default', 'hover'],
  navbar: ['default'],
  tabs: ['default'],
  toggle: ['on', 'off'],
  checkbox: ['unchecked', 'checked'],
  avatar: ['default'],
  text: ['default'],
  image: ['default'],
  badge: ['default'],
  select: ['default', 'open', 'disabled'],
};

/** Page-level preview states. Each one carries its own editable copy. */
export const PAGE_STATES = ['normal', 'loading', 'empty', 'error'];

const PRESETS = {
  mobile: [390, 844],
  tablet: [768, 1024],
  desktop: [1280, 800],
};

const INTERACTION_ACTIONS = ['navigate', 'back', 'openOverlay'];

let seq = 0;
function newId(prefix) {
  seq += 1;
  const rnd =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix + Date.now().toString(36) + seq.toString(36) + rnd;
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v, d) => (typeof v === 'string' ? v : d);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function normalizeInteractions(raw) {
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

function normalizePageStates(raw) {
  const src = isObj(raw) ? raw : {};
  const pick = (key, fields) => {
    const value = isObj(src[key]) ? src[key] : {};
    const out = {};
    for (const field of fields) out[field] = str(value[field], '');
    return out;
  };
  return {
    loading: pick('loading', ['text']),
    empty: pick('empty', ['title', 'desc', 'action']),
    error: pick('error', ['title', 'desc', 'action']),
  };
}

export function emptyDoc() {
  return { name: '', pages: [], activePageId: null };
}

export function defaultStateFor(type) {
  if (type === 'toggle') return 'on';
  if (type === 'checkbox') return 'unchecked';
  return 'default';
}

function ensureElement(raw) {
  const e = isObj(raw) ? raw : {};
  const type = ELEMENT_TYPES[e.type] ? e.type : 'text';
  const [dw, dh] = ELEMENT_TYPES[type];
  const states = ELEMENT_STATES[type] || ['default'];
  const out = {
    id: str(e.id, '') || newId('e'),
    type,
    name: str(e.name, ''),
    x: num(e.x, 0),
    y: num(e.y, 0),
    w: Math.max(12, num(e.w, dw)),
    h: Math.max(8, num(e.h, dh)),
    hidden: e.hidden === true,
    locked: e.locked === true,
    opacity: clamp01(num(e.opacity, 1)),
    state: states.includes(e.state) ? e.state : defaultStateFor(type),
    props: isObj(e.props) ? clone(e.props) : {},
    interactions: normalizeInteractions(e.interactions),
    constraints: normalizeConstraints(e.constraints, type),
  };
  if (isContainerType(type)) {
    out.layout = normalizeLayout(e.layout);
    out.children = Array.isArray(e.children) ? e.children.filter(isObj).map(ensureElement) : [];
  }
  return out;
}

function ensurePage(raw) {
  const p = isObj(raw) ? raw : {};
  const frame = isObj(p.frame) ? p.frame : {};
  const preset = PRESETS[frame.preset] ? frame.preset : 'mobile';
  const size = PRESETS[preset];
  return {
    id: str(p.id, '') || newId('p'),
    name: str(p.name, 'Page'),
    frame: {
      w: Math.max(1, num(frame.w, size[0])),
      h: Math.max(1, num(frame.h, size[1])),
      preset,
      background: str(frame.background, '#ffffff'),
    },
    states: normalizePageStates(p.states),
    elements: Array.isArray(p.elements) ? p.elements.filter(isObj).map(ensureElement) : [],
  };
}

/** Coerce any stored/raw value into a valid document (drops unknown junk). */
export function ensureDoc(raw) {
  const doc = isObj(raw) ? clone(raw) : emptyDoc();
  doc.pages = Array.isArray(doc.pages) ? doc.pages.filter(isObj).map(ensurePage) : [];
  doc.name = str(doc.name, '');
  if (!doc.pages.some((p) => p.id === doc.activePageId)) {
    doc.activePageId = doc.pages.length ? doc.pages[0].id : null;
  }
  return doc;
}

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

  if (kind === 'set_document_name') {
    doc.name = str(op.name, '');
    return { op: index, kind };
  }

  if (kind === 'add_page') {
    const preset = PRESETS[op.preset] ? op.preset : 'mobile';
    const size = PRESETS[preset];
    const page = ensurePage({
      id: newId('p'),
      name: str(op.name, `Page ${doc.pages.length + 1}`),
      frame: {
        w: Math.max(1, num(op.width, size[0])),
        h: Math.max(1, num(op.height, size[1])),
        preset,
        background: str(op.background, '#ffffff'),
      },
      elements: [],
    });
    doc.pages.push(page);
    doc.activePageId = page.id;
    return { op: index, kind, pageId: page.id, name: page.name };
  }

  if (kind === 'duplicate_page') {
    const source = requirePageById(doc, op.pageId, index, 'duplicate_page');
    const copy = ensurePage({
      id: newId('p'),
      name: str(op.name, `${source.name} copy`),
      frame: { ...source.frame },
      states: clone(source.states),
      elements: source.elements.map((el) => cloneElementDeep(el, () => newId('e'))),
    });
    const at = doc.pages.indexOf(source) + 1;
    doc.pages.splice(at, 0, copy);
    doc.activePageId = copy.id;
    return { op: index, kind, pageId: copy.id, name: copy.name };
  }

  if (kind === 'delete_page') {
    const idx = doc.pages.findIndex((p) => p.id === op.pageId);
    if (idx === -1) throw new Error(`op[${index}] delete_page: unknown page "${op.pageId}"`);
    if (doc.pages.length <= 1)
      throw new Error(`op[${index}] delete_page: cannot delete the last page`);
    doc.pages.splice(idx, 1);
    if (doc.activePageId === op.pageId) doc.activePageId = doc.pages[0]?.id ?? null;
    return { op: index, kind, pageId: op.pageId };
  }

  if (kind === 'rename_page') {
    const page = findPage(doc, op, index);
    page.name = str(op.name, page.name);
    return { op: index, kind, pageId: page.id };
  }

  if (kind === 'set_active_page') {
    const page = requirePageById(doc, op.pageId, index, 'set_active_page');
    doc.activePageId = page.id;
    return { op: index, kind, pageId: page.id };
  }

  if (kind === 'set_page_frame') {
    const page = findPage(doc, op, index);
    const preset = PRESETS[op.preset] ? op.preset : page.frame.preset;
    const size = PRESETS[preset] || [page.frame.w, page.frame.h];
    const nw = Math.max(1, num(op.width, op.preset ? size[0] : page.frame.w));
    const nh = Math.max(1, num(op.height, op.preset ? size[1] : page.frame.h));
    const mode = ['constraints', 'scale', 'none'].includes(op.resizeMode)
      ? op.resizeMode
      : 'constraints';
    const resized = resizePage(page, nw, nh, mode);
    page.elements = resized.elements;
    page.frame = {
      preset,
      w: nw,
      h: nh,
      background: str(op.background, page.frame.background),
    };
    return { op: index, kind, pageId: page.id, resizeMode: mode };
  }

  if (kind === 'set_page_states') {
    const page = findPage(doc, op, index);
    const patch = isObj(op.states) ? op.states : {};
    const merged = {};
    for (const key of ['loading', 'empty', 'error']) {
      merged[key] = {
        ...((page.states && page.states[key]) || {}),
        ...(isObj(patch[key]) ? patch[key] : {}),
      };
    }
    page.states = normalizePageStates(merged);
    return { op: index, kind, pageId: page.id };
  }

  if (kind === 'clear_page') {
    const page = findPage(doc, op, index);
    page.elements = [];
    return { op: index, kind, pageId: page.id };
  }

  if (kind === 'add_element') {
    const page = findPage(doc, op, index);
    const type = ELEMENT_TYPES[op.type] ? op.type : null;
    if (!type) throw new Error(`op[${index}] add_element: unknown type "${op.type}"`);
    const containerId = op.containerId === '@last' ? state.lastContainerId : op.containerId;
    const target = containerId ? findElementEntry(page.elements, containerId) : null;
    if (containerId && (!target || !isContainerType(target.el.type)))
      throw new Error(`op[${index}] add_element: unknown container "${containerId}"`);
    const [dw, dh] = ELEMENT_TYPES[type];
    const fullWidth = type === 'navbar' || type === 'tabs';
    const boundW = target ? target.el.w : page.frame.w;
    const targetList = target ? target.el.children || [] : page.elements;
    const w = Math.max(12, num(op.w, fullWidth ? boundW : dw));
    const n = targetList.length;
    const el = ensureElement({
      id: newId('e'),
      type,
      name: str(op.name, ''),
      x: num(op.x, target ? 16 : fullWidth ? 0 : 24),
      y: num(op.y, 24 + (n % 10) * 18),
      w,
      h: Math.max(8, num(op.h, dh)),
      hidden: op.hidden === true,
      locked: op.locked === true,
      opacity: num(op.opacity, 1),
      state: op.state,
      props: op.props,
      interactions: op.interactions,
      constraints: op.constraints,
      layout: op.layout,
    });
    if (target) target.el.children = [...(target.el.children || []), el];
    else page.elements.push(el);
    if (type === 'container') state.lastContainerId = el.id;
    return { op: index, kind, pageId: page.id, elementId: el.id, type };
  }

  if (kind === 'add_container') {
    const page = findPage(doc, op, index);
    const containerId = op.containerId === '@last' ? state.lastContainerId : op.containerId;
    const target = containerId ? findElementEntry(page.elements, containerId) : null;
    if (containerId && (!target || !isContainerType(target.el.type)))
      throw new Error(`op[${index}] add_container: unknown container "${containerId}"`);
    const boundW = target ? target.el.w : page.frame.w;
    const boundH = target ? target.el.h : page.frame.h;
    const n = (target ? target.el.children || [] : page.elements).length;
    const el = ensureElement({
      id: newId('e'),
      type: 'container',
      name: str(op.name, `Container ${n + 1}`),
      x: num(op.x, Math.min(24, Math.max(0, boundW - 40))),
      y: num(op.y, 24 + (n % 8) * 18),
      w: Math.max(12, num(op.w, Math.min(320, boundW))),
      h: Math.max(8, num(op.h, Math.min(240, boundH))),
      hidden: op.hidden === true,
      locked: op.locked === true,
      opacity: num(op.opacity, 1),
      constraints: op.constraints,
      layout: op.layout,
      props: {
        name: str(op.name, `Container ${n + 1}`),
        background: str(op.background, '#ffffff'),
        radius: num(op.radius, 12),
        clipContent: op.clipContent !== false,
      },
    });
    if (target) target.el.children = [...(target.el.children || []), el];
    else page.elements.push(el);
    state.lastContainerId = el.id;
    return { op: index, kind, pageId: page.id, elementId: el.id, type: 'container' };
  }

  if (kind === 'update_element') {
    const page = findPageForElement(doc, op, index);
    const entry = findElementEntry(page.elements, op.elementId);
    if (!entry) throw new Error(`op[${index}] update_element: unknown element "${op.elementId}"`);
    const el = entry.el;
    if (op.x !== undefined) el.x = num(op.x, el.x);
    if (op.y !== undefined) el.y = num(op.y, el.y);
    if (op.w !== undefined) el.w = Math.max(12, num(op.w, el.w));
    if (op.h !== undefined) el.h = Math.max(8, num(op.h, el.h));
    if (op.name !== undefined) el.name = str(op.name, el.name);
    if (op.hidden !== undefined) el.hidden = op.hidden === true;
    if (op.locked !== undefined) el.locked = op.locked === true;
    if (op.opacity !== undefined) el.opacity = clamp01(num(op.opacity, el.opacity));
    if (op.state !== undefined && (ELEMENT_STATES[el.type] || []).includes(op.state))
      el.state = op.state;
    if (op.interactions !== undefined) el.interactions = normalizeInteractions(op.interactions);
    if (op.constraints !== undefined)
      el.constraints = normalizeConstraints(op.constraints, el.type);
    if (op.layout !== undefined) el.layout = normalizeLayout(op.layout);
    if (isObj(op.props)) el.props = { ...el.props, ...clone(op.props) };
    return { op: index, kind, pageId: page.id, elementId: el.id };
  }

  if (kind === 'delete_element') {
    const page = findPageForElement(doc, op, index);
    const before = collectElementEntries(page.elements).length;
    page.elements = removeElementById(page.elements, op.elementId);
    if (collectElementEntries(page.elements).length === before)
      throw new Error(`op[${index}] delete_element: unknown element "${op.elementId}"`);
    return { op: index, kind, pageId: page.id, elementId: op.elementId };
  }

  if (kind === 'move_element') {
    const page = findPageForElement(doc, op, index);
    const entry = findElementEntry(page.elements, op.elementId);
    if (!entry) throw new Error(`op[${index}] move_element: unknown element "${op.elementId}"`);
    const containerId = op.containerId === undefined ? null : op.containerId;
    if (containerId && containerId === op.elementId)
      throw new Error(`op[${index}] move_element: cannot move an element into itself`);
    if (containerId && descendantIds(entry.el).includes(containerId))
      throw new Error(`op[${index}] move_element: cannot move into a descendant`);
    const absX = entry.absX;
    const absY = entry.absY;
    const removed = removeElementById(page.elements, op.elementId);
    const moved = { ...entry.el, x: 0, y: 0 };
    if (containerId) {
      const target = findElementEntry(removed, containerId);
      if (!target || !isContainerType(target.el.type))
        throw new Error(`op[${index}] move_element: unknown container "${containerId}"`);
      moved.x = Math.round(absX - target.absX);
      moved.y = Math.round(absY - target.absY);
      const kids = (target.el.children || []).slice();
      const at = Number.isFinite(op.index)
        ? Math.max(0, Math.min(kids.length, Number(op.index)))
        : kids.length;
      kids.splice(at, 0, moved);
      target.el.children = kids;
    } else {
      moved.x = Math.round(absX);
      moved.y = Math.round(absY);
      const at = Number.isFinite(op.index)
        ? Math.max(0, Math.min(removed.length, Number(op.index)))
        : removed.length;
      removed.splice(at, 0, moved);
    }
    page.elements = removed;
    return { op: index, kind, pageId: page.id, elementId: moved.id };
  }

  if (kind === 'reorder_element') {
    const page = findPageForElement(doc, op, index);
    const position = ['front', 'back', 'forward', 'backward'].includes(op.position)
      ? op.position
      : 'front';
    if (!findElementEntry(page.elements, op.elementId))
      throw new Error(`op[${index}] reorder_element: unknown element "${op.elementId}"`);
    page.elements = reorderInTree(page.elements, op.elementId, position);
    return { op: index, kind, pageId: page.id, elementId: op.elementId, position };
  }

  if (kind === 'group_elements') {
    const page = findPageForElement(doc, op, index);
    const ids = Array.isArray(op.elementIds) ? op.elementIds : [];
    if (ids.length < 2) throw new Error(`op[${index}] group_elements: need at least two ids`);
    const entries = ids.map((id) => findElementEntry(page.elements, id));
    if (entries.some((entry) => !entry))
      throw new Error(`op[${index}] group_elements: unknown element id`);
    const list = entries[0].list;
    if (!entries.every((entry) => entry.list === list))
      throw new Error(`op[${index}] group_elements: elements must share a parent`);
    const bounds = boundsOfEntries(entries);
    const parentAbsX = entries[0].absX - entries[0].el.x;
    const parentAbsY = entries[0].absY - entries[0].el.y;
    const group = ensureElement({
      id: newId('e'),
      type: 'group',
      name: str(op.name, 'Group'),
      x: bounds.x - parentAbsX,
      y: bounds.y - parentAbsY,
      w: bounds.w,
      h: bounds.h,
    });
    group.children = entries.map((entry) => {
      const copy = cloneElementDeep(entry.el);
      copy.x = entry.absX - bounds.x;
      copy.y = entry.absY - bounds.y;
      return copy;
    });
    const idSet = new Set(ids);
    const insertAt = Math.min(...entries.map((entry) => entry.index));
    const remaining = list.filter((el) => !idSet.has(el.id));
    remaining.splice(insertAt, 0, group);
    if (entries[0].parent) entries[0].parent.children = remaining;
    else page.elements = remaining;
    return { op: index, kind, pageId: page.id, groupId: group.id };
  }

  if (kind === 'ungroup_elements') {
    const page = findPageForElement(doc, op, index);
    const entry = findElementEntry(page.elements, op.elementId);
    if (!entry) throw new Error(`op[${index}] ungroup_elements: unknown element "${op.elementId}"`);
    if (entry.el.type !== 'group')
      throw new Error(`op[${index}] ungroup_elements: element is not a group`);
    const group = entry.el;
    const kids = (group.children || []).map((child) => {
      const copy = cloneElementDeep(child);
      copy.x += group.x;
      copy.y += group.y;
      return copy;
    });
    const next = entry.list.slice();
    next.splice(entry.index, 1, ...kids);
    if (entry.parent) entry.parent.children = next;
    else page.elements = next;
    return { op: index, kind, pageId: page.id, elementIds: kids.map((kid) => kid.id) };
  }

  throw new Error(`op[${index}] has unknown kind "${kind}"`);
}

function removeElementById(elements, id) {
  let changed = false;
  const out = [];
  for (const el of elements) {
    if (el.id === id) {
      changed = true;
      continue;
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = removeElementById(el.children, id);
      if (kids !== el.children) {
        changed = true;
        out.push({ ...el, children: kids });
        continue;
      }
    }
    out.push(el);
  }
  return changed ? out : elements;
}

/**
 * Apply an ordered operation list to a document.
 * @returns {{ doc: object, results: object[] }} the new document and per-op results.
 * @throws when any op is invalid (the caller decides whether to keep the old doc).
 */
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
    pages: doc.pages.map((p) => {
      const entries = collectElementEntries(p.elements);
      return {
        id: p.id,
        name: p.name,
        frame: `${p.frame.w}×${p.frame.h}`,
        elements: entries.length,
        containers: entries.filter((entry) => isContainerType(entry.el.type)).length,
        links: entries.filter((entry) => entry.el.interactions?.length).length,
      };
    }),
  };
}
