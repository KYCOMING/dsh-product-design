/**
 * Host-side document model for dsh-product-design.
 *
 * Pure functions only (no I/O, no Cordis, no DOM) so the same reducer can be
 * unit-tested in isolation and reused by the Host tools. The Host owns the
 * document and applies ordered operations; the browser panel is a view over it.
 *
 * Document shape (mirrors the client's v2 model):
 *   { name, activePageId, pages: [{ id, name, frame: {w,h,preset,background}, elements: [] }] }
 * Element shape:
 *   { id, type, x, y, w, h, state, props: { text, color, fontSize, fontWeight, radius } }
 */

export const ELEMENT_TYPES = {
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

const PRESETS = {
  mobile: [390, 844],
  tablet: [768, 1024],
  desktop: [1280, 800],
};

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

/** Scale a component's font size / radius with the frame change factor. */
function scaleProps(props, s) {
  const out = isObj(props) ? { ...props } : {};
  if (typeof out.fontSize === 'number') out.fontSize = Math.max(8, Math.round(out.fontSize * s));
  if (typeof out.radius === 'number') out.radius = Math.max(0, Math.round(out.radius * s));
  return out;
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

export function emptyDoc() {
  return { name: '', pages: [], activePageId: null };
}

export function defaultStateFor(type) {
  if (type === 'toggle') return 'on';
  if (type === 'checkbox') return 'unchecked';
  return 'default';
}

/** Coerce any stored/raw value into a valid document (drops unknown junk). */
export function ensureDoc(raw) {
  const doc = isObj(raw) ? clone(raw) : emptyDoc();
  if (!Array.isArray(doc.pages)) doc.pages = [];
  doc.pages = doc.pages.filter(isObj).map((p) => {
    const frame = isObj(p.frame) ? p.frame : {};
    const preset = PRESETS[frame.preset] ? frame.preset : 'mobile';
    const size = PRESETS[preset];
    return {
      id: str(p.id, '') || newId('p'),
      name: str(p.name, 'Page'),
      frame: {
        w: num(frame.w, size[0]),
        h: num(frame.h, size[1]),
        preset,
        background: str(frame.background, '#ffffff'),
      },
      elements: Array.isArray(p.elements) ? p.elements.filter(isObj).map(ensureElement) : [],
    };
  });
  if (typeof doc.name !== 'string') doc.name = '';
  if (!doc.pages.some((p) => p.id === doc.activePageId)) {
    doc.activePageId = doc.pages.length ? doc.pages[0].id : null;
  }
  return doc;
}

function ensureElement(e) {
  const type = ELEMENT_TYPES[e.type] ? e.type : 'text';
  const [dw, dh] = ELEMENT_TYPES[type];
  const props = isObj(e.props) ? clone(e.props) : {};
  const states = ELEMENT_STATES[type] || ['default'];
  const state = states.includes(e.state) ? e.state : defaultStateFor(type);
  return {
    id: str(e.id, '') || newId('e'),
    type,
    x: num(e.x, 0),
    y: num(e.y, 0),
    w: Math.max(12, num(e.w, dw)),
    h: Math.max(8, num(e.h, dh)),
    state,
    props,
  };
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
    page = doc.pages[0];
  }
  if (!page) {
    const target = op && op.pageId !== undefined ? `"${op.pageId}"` : String(op && op.pageIndex);
    throw new Error(`op[${opIndex}] references unknown page ${target}; add a page first`);
  }
  return page;
}

function applyOne(doc, op, index) {
  if (!isObj(op)) throw new Error(`op[${index}] must be an object`);
  const kind = op.kind;

  if (kind === 'set_document_name') {
    doc.name = str(op.name, '');
    return { op: index, kind };
  }

  if (kind === 'add_page') {
    const preset = PRESETS[op.preset] ? op.preset : 'mobile';
    const size = PRESETS[preset];
    const page = {
      id: newId('p'),
      name: str(op.name, `Page ${doc.pages.length + 1}`),
      frame: {
        w: Math.max(1, num(op.width, size[0])),
        h: Math.max(1, num(op.height, size[1])),
        preset,
        background: str(op.background, '#ffffff'),
      },
      elements: [],
    };
    doc.pages.push(page);
    if (!doc.activePageId) doc.activePageId = page.id;
    return { op: index, kind, pageId: page.id, name: page.name };
  }

  if (kind === 'delete_page') {
    const idx = doc.pages.findIndex((p) => p.id === op.pageId);
    if (idx === -1) throw new Error(`op[${index}] delete_page: unknown page "${op.pageId}"`);
    if (doc.pages.length <= 1) throw new Error(`op[${index}] delete_page: cannot delete the last page`);
    doc.pages.splice(idx, 1);
    if (doc.activePageId === op.pageId) doc.activePageId = doc.pages[0]?.id ?? null;
    return { op: index, kind, pageId: op.pageId };
  }

  if (kind === 'rename_page') {
    const page = findPage(doc, op, index);
    page.name = str(op.name, page.name);
    return { op: index, kind, pageId: page.id };
  }

  if (kind === 'set_page_frame') {
    const page = findPage(doc, op, index);
    const preset = PRESETS[op.preset] ? op.preset : page.frame.preset;
    const size = PRESETS[preset] || [page.frame.w, page.frame.h];
    const nw = Math.max(1, num(op.width, op.preset ? size[0] : page.frame.w));
    const nh = Math.max(1, num(op.height, op.preset ? size[1] : page.frame.h));
    const ow = page.frame.w;
    const oh = page.frame.h;
    if (op.scaleElements !== false && ow > 0 && oh > 0 && (ow !== nw || oh !== nh)) {
      const s = Math.min(nw / ow, nh / oh);
      page.elements = page.elements.map((e) => ({
        ...e,
        x: Math.round(e.x * s),
        y: Math.round(e.y * s),
        w: Math.max(12, Math.round(e.w * s)),
        h: Math.max(8, Math.round(e.h * s)),
        props: scaleProps(e.props, s),
      }));
    }
    page.frame = {
      preset,
      w: nw,
      h: nh,
      background: str(op.background, page.frame.background),
    };
    return { op: index, kind, pageId: page.id, scaled: op.scaleElements !== false };
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
    const [dw, dh] = ELEMENT_TYPES[type];
    const fullWidth = type === 'navbar' || type === 'tabs';
    const w = Math.max(12, num(op.w, fullWidth ? page.frame.w : dw));
    const n = page.elements.length;
    const el = ensureElement({
      id: newId('e'),
      type,
      x: num(op.x, fullWidth ? 0 : 24),
      y: num(op.y, 24 + (n % 10) * 18),
      w,
      h: Math.max(8, num(op.h, dh)),
      state: op.state,
      props: op.props,
    });
    page.elements.push(el);
    return { op: index, kind, pageId: page.id, elementId: el.id, type };
  }

  if (kind === 'update_element') {
    const page = findPage(doc, op, index);
    const el = page.elements.find((e) => e.id === op.elementId);
    if (!el) throw new Error(`op[${index}] update_element: unknown element "${op.elementId}"`);
    if (op.x !== undefined) el.x = num(op.x, el.x);
    if (op.y !== undefined) el.y = num(op.y, el.y);
    if (op.w !== undefined) el.w = Math.max(12, num(op.w, el.w));
    if (op.h !== undefined) el.h = Math.max(8, num(op.h, el.h));
    if (op.state !== undefined && (ELEMENT_STATES[el.type] || []).includes(op.state)) el.state = op.state;
    if (isObj(op.props)) el.props = { ...el.props, ...clone(op.props) };
    return { op: index, kind, pageId: page.id, elementId: el.id };
  }

  if (kind === 'delete_element') {
    const page = findPage(doc, op, index);
    const before = page.elements.length;
    page.elements = page.elements.filter((e) => e.id !== op.elementId);
    if (page.elements.length === before) throw new Error(`op[${index}] delete_element: unknown element "${op.elementId}"`);
    return { op: index, kind, pageId: page.id, elementId: op.elementId };
  }

  throw new Error(`op[${index}] has unknown kind "${kind}"`);
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
  const results = ops.map((op, i) => applyOne(doc, op, i));
  if (!doc.activePageId && doc.pages.length) doc.activePageId = doc.pages[0].id;
  return { doc, results };
}

/** A short human/model-readable summary of a document (for tool output). */
export function summarizeDoc(rawDoc) {
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  return {
    name: doc.name,
    activePageId: doc.activePageId,
    pages: doc.pages.map((p) => ({
      id: p.id,
      name: p.name,
      frame: `${p.frame.w}×${p.frame.h}`,
      elements: p.elements.length,
    })),
  };
}
