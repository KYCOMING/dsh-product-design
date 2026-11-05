// src/host/index.js
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// src/shared/elements.js
var CONTAINER_TYPES = ["container", "group"];
function isContainerType(type) {
  return CONTAINER_TYPES.indexOf(type) !== -1;
}
function isContainer(el) {
  return !!el && isContainerType(el.type);
}
function collectElementEntries(elements, parent = null, parentAbsX = 0, parentAbsY = 0, depth = 0, ancestors = []) {
  const out = [];
  if (!Array.isArray(elements)) return out;
  elements.forEach((el, index) => {
    if (!el || typeof el !== "object") return;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const w = Math.max(0, Number(el.w) || 0);
    const h = Math.max(0, Number(el.h) || 0);
    const absX = parentAbsX + x;
    const absY = parentAbsY + y;
    out.push({ el, parent, ancestors, list: elements, index, depth, absX, absY, w, h });
    if (isContainer(el) && Array.isArray(el.children) && el.children.length) {
      out.push(
        ...collectElementEntries(el.children, el, absX, absY, depth + 1, [...ancestors, el.id])
      );
    }
  });
  return out;
}
function findElementEntry(elements, id, parent = null, parentAbsX = 0, parentAbsY = 0, depth = 0, ancestors = []) {
  if (!Array.isArray(elements) || !id) return null;
  for (let index = 0; index < elements.length; index += 1) {
    const el = elements[index];
    if (!el || typeof el !== "object") continue;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const absX = parentAbsX + x;
    const absY = parentAbsY + y;
    if (el.id === id) {
      return {
        el,
        parent,
        ancestors,
        list: elements,
        index,
        depth,
        absX,
        absY,
        w: Math.max(0, Number(el.w) || 0),
        h: Math.max(0, Number(el.h) || 0)
      };
    }
    if (isContainer(el) && Array.isArray(el.children)) {
      const found = findElementEntry(el.children, id, el, absX, absY, depth + 1, [
        ...ancestors,
        el.id
      ]);
      if (found) return found;
    }
  }
  return null;
}
function boundsOfEntries(entries) {
  if (!entries || !entries.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of entries) {
    minX = Math.min(minX, e.absX);
    minY = Math.min(minY, e.absY);
    maxX = Math.max(maxX, e.absX + e.w);
    maxY = Math.max(maxY, e.absY + e.h);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
function cloneElementDeep(el, nextId) {
  if (!el || typeof el !== "object") return null;
  const copy = { ...el, props: { ...el.props || {} } };
  copy.id = nextId ? nextId(el.id) : el.id;
  if (isContainer(el) && Array.isArray(el.children)) {
    copy.children = el.children.map((child) => cloneElementDeep(child, nextId));
  } else {
    delete copy.children;
  }
  return copy;
}

// src/host/model.js
var ELEMENT_TYPES = {
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
  select: [220, 44]
};
var ELEMENT_STATES = {
  container: ["default"],
  group: ["default"],
  button: ["default", "hover", "active", "disabled"],
  input: ["default", "focus", "filled", "error", "disabled"],
  card: ["default", "hover"],
  navbar: ["default"],
  tabs: ["default"],
  toggle: ["on", "off"],
  checkbox: ["unchecked", "checked"],
  avatar: ["default"],
  text: ["default"],
  image: ["default"],
  badge: ["default"],
  select: ["default", "open", "disabled"]
};
var PRESETS = {
  mobile: [390, 844],
  tablet: [768, 1024],
  desktop: [1280, 800]
};
var seq = 0;
function newId(prefix) {
  seq += 1;
  const rnd = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return prefix + Date.now().toString(36) + seq.toString(36) + rnd;
}
var isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
var num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
var str = (v, d) => typeof v === "string" ? v : d;
function elementsBounds(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return null;
  const entries = collectElementEntries(elements);
  const b = boundsOfEntries(entries);
  if (!b) return null;
  return { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.h, w: b.w, h: b.h };
}
function scaleProps(props, s) {
  const out = isObj(props) ? { ...props } : {};
  if (typeof out.fontSize === "number") out.fontSize = Math.max(8, Math.round(out.fontSize * s));
  if (typeof out.radius === "number") out.radius = Math.max(0, Math.round(out.radius * s));
  return out;
}
function scaleElementDeep(e, sx, sy, sf, ox, oy, isRoot) {
  const out = {
    ...e,
    x: Math.round((isRoot ? e.x - ox : e.x) * sx),
    y: Math.round((isRoot ? e.y - oy : e.y) * sy),
    w: Math.max(12, Math.round(e.w * sx)),
    h: Math.max(8, Math.round(e.h * sy)),
    props: scaleProps(e.props, sf)
  };
  if (isContainerType(e.type) && Array.isArray(e.children)) {
    out.children = e.children.map((child) => scaleElementDeep(child, sx, sy, sf, 0, 0, false));
  }
  return out;
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
function clone(x) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(x);
    } catch {
    }
  }
  return JSON.parse(JSON.stringify(x));
}
function emptyDoc() {
  return { name: "", pages: [], activePageId: null };
}
function defaultStateFor(type) {
  if (type === "toggle") return "on";
  if (type === "checkbox") return "unchecked";
  return "default";
}
function ensureDoc(raw) {
  const doc = isObj(raw) ? clone(raw) : emptyDoc();
  if (!Array.isArray(doc.pages)) doc.pages = [];
  doc.pages = doc.pages.filter(isObj).map((p) => {
    const frame = isObj(p.frame) ? p.frame : {};
    const preset = PRESETS[frame.preset] ? frame.preset : "mobile";
    const size = PRESETS[preset];
    return {
      id: str(p.id, "") || newId("p"),
      name: str(p.name, "Page"),
      frame: {
        w: num(frame.w, size[0]),
        h: num(frame.h, size[1]),
        preset,
        background: str(frame.background, "#ffffff")
      },
      elements: Array.isArray(p.elements) ? p.elements.filter(isObj).map(ensureElement) : []
    };
  });
  if (typeof doc.name !== "string") doc.name = "";
  if (!doc.pages.some((p) => p.id === doc.activePageId)) {
    doc.activePageId = doc.pages.length ? doc.pages[0].id : null;
  }
  return doc;
}
function ensureElement(e) {
  const type = ELEMENT_TYPES[e.type] ? e.type : "text";
  const [dw, dh] = ELEMENT_TYPES[type];
  const props = isObj(e.props) ? clone(e.props) : {};
  const states = ELEMENT_STATES[type] || ["default"];
  const state = states.includes(e.state) ? e.state : defaultStateFor(type);
  const out = {
    id: str(e.id, "") || newId("e"),
    type,
    x: num(e.x, 0),
    y: num(e.y, 0),
    w: Math.max(12, num(e.w, dw)),
    h: Math.max(8, num(e.h, dh)),
    state,
    props
  };
  if (isContainerType(type)) {
    out.children = Array.isArray(e.children) ? e.children.filter(isObj).map(ensureElement) : [];
  }
  return out;
}
function findPage(doc, op, opIndex) {
  let page;
  if (op && op.pageId === "@last") {
    page = doc.pages[doc.pages.length - 1];
  } else if (op && typeof op.pageIndex === "number" && Number.isFinite(op.pageIndex)) {
    page = doc.pages[op.pageIndex];
  } else if (op && op.pageId) {
    page = doc.pages.find((p) => p.id === op.pageId);
  } else {
    page = doc.pages[0];
  }
  if (!page) {
    const target = op && op.pageId !== void 0 ? `"${op.pageId}"` : String(op && op.pageIndex);
    throw new Error(`op[${opIndex}] references unknown page ${target}; add a page first`);
  }
  return page;
}
function applyOne(doc, op, index, state) {
  if (!isObj(op)) throw new Error(`op[${index}] must be an object`);
  const kind = op.kind;
  if (kind === "set_document_name") {
    doc.name = str(op.name, "");
    return { op: index, kind };
  }
  if (kind === "add_page") {
    const preset = PRESETS[op.preset] ? op.preset : "mobile";
    const size = PRESETS[preset];
    const page = {
      id: newId("p"),
      name: str(op.name, `Page ${doc.pages.length + 1}`),
      frame: {
        w: Math.max(1, num(op.width, size[0])),
        h: Math.max(1, num(op.height, size[1])),
        preset,
        background: str(op.background, "#ffffff")
      },
      elements: []
    };
    doc.pages.push(page);
    if (!doc.activePageId) doc.activePageId = page.id;
    return { op: index, kind, pageId: page.id, name: page.name };
  }
  if (kind === "delete_page") {
    const idx = doc.pages.findIndex((p) => p.id === op.pageId);
    if (idx === -1) throw new Error(`op[${index}] delete_page: unknown page "${op.pageId}"`);
    if (doc.pages.length <= 1)
      throw new Error(`op[${index}] delete_page: cannot delete the last page`);
    doc.pages.splice(idx, 1);
    if (doc.activePageId === op.pageId) doc.activePageId = doc.pages[0]?.id ?? null;
    return { op: index, kind, pageId: op.pageId };
  }
  if (kind === "rename_page") {
    const page = findPage(doc, op, index);
    page.name = str(op.name, page.name);
    return { op: index, kind, pageId: page.id };
  }
  if (kind === "set_page_frame") {
    const page = findPage(doc, op, index);
    const preset = PRESETS[op.preset] ? op.preset : page.frame.preset;
    const size = PRESETS[preset] || [page.frame.w, page.frame.h];
    const nw = Math.max(1, num(op.width, op.preset ? size[0] : page.frame.w));
    const nh = Math.max(1, num(op.height, op.preset ? size[1] : page.frame.h));
    const ow = page.frame.w;
    const oh = page.frame.h;
    if (op.scaleElements !== false && ow > 0 && oh > 0 && (ow !== nw || oh !== nh)) {
      const b = elementsBounds(page.elements);
      const hasContent = b && b.w > 0 && b.h > 0;
      const hasContainer = page.elements.some((e) => isContainerType(e.type));
      const inconsistent = !hasContainer && hasContent && b.w >= ow * 0.4 && b.w < ow * 0.8;
      const sx = inconsistent ? nw / b.w : nw / ow;
      const sy = inconsistent ? nh / b.h : nh / oh;
      const ox = inconsistent ? b.minX : 0;
      const oy = inconsistent ? b.minY : 0;
      const sf = Math.min(sx, sy);
      page.elements = page.elements.map((e) => scaleElementDeep(e, sx, sy, sf, ox, oy, true));
    }
    page.frame = {
      preset,
      w: nw,
      h: nh,
      background: str(op.background, page.frame.background)
    };
    return { op: index, kind, pageId: page.id, scaled: op.scaleElements !== false };
  }
  if (kind === "clear_page") {
    const page = findPage(doc, op, index);
    page.elements = [];
    return { op: index, kind, pageId: page.id };
  }
  if (kind === "add_element") {
    const page = findPage(doc, op, index);
    const type = ELEMENT_TYPES[op.type] ? op.type : null;
    if (!type) throw new Error(`op[${index}] add_element: unknown type "${op.type}"`);
    const containerId = op.containerId === "@last" ? state.lastContainerId : op.containerId;
    const target = containerId ? findElementEntry(page.elements, containerId) : null;
    if (containerId && (!target || !isContainerType(target.el.type)))
      throw new Error(`op[${index}] add_element: unknown container "${containerId}"`);
    const [dw, dh] = ELEMENT_TYPES[type];
    const fullWidth = type === "navbar" || type === "tabs";
    const boundW = target ? target.el.w : page.frame.w;
    const targetList = target ? target.el.children || [] : page.elements;
    const w = Math.max(12, num(op.w, fullWidth ? boundW : dw));
    const n = targetList.length;
    const el = ensureElement({
      id: newId("e"),
      type,
      x: num(op.x, target ? 16 : fullWidth ? 0 : 24),
      y: num(op.y, 24 + n % 10 * 18),
      w,
      h: Math.max(8, num(op.h, dh)),
      state: op.state,
      props: op.props
    });
    if (target) target.el.children = [...target.el.children || [], el];
    else page.elements.push(el);
    if (type === "container") state.lastContainerId = el.id;
    return { op: index, kind, pageId: page.id, elementId: el.id, type };
  }
  if (kind === "add_container") {
    const page = findPage(doc, op, index);
    const containerId = op.containerId === "@last" ? state.lastContainerId : op.containerId;
    const target = containerId ? findElementEntry(page.elements, containerId) : null;
    if (containerId && (!target || !isContainerType(target.el.type)))
      throw new Error(`op[${index}] add_container: unknown container "${containerId}"`);
    const boundW = target ? target.el.w : page.frame.w;
    const boundH = target ? target.el.h : page.frame.h;
    const n = (target ? target.el.children || [] : page.elements).length;
    const el = ensureElement({
      id: newId("e"),
      type: "container",
      x: num(op.x, Math.min(24, Math.max(0, boundW - 40))),
      y: num(op.y, 24 + n % 8 * 18),
      w: Math.max(12, num(op.w, Math.min(320, boundW))),
      h: Math.max(8, num(op.h, Math.min(240, boundH))),
      props: {
        name: str(op.name, `Container ${n + 1}`),
        background: str(op.background, "#ffffff"),
        radius: num(op.radius, 12),
        clipContent: op.clipContent !== false
      }
    });
    if (target) target.el.children = [...target.el.children || [], el];
    else page.elements.push(el);
    state.lastContainerId = el.id;
    return { op: index, kind, pageId: page.id, elementId: el.id, type: "container" };
  }
  if (kind === "update_element") {
    const page = findPage(doc, op, index);
    const entry = findElementEntry(page.elements, op.elementId);
    if (!entry) throw new Error(`op[${index}] update_element: unknown element "${op.elementId}"`);
    const el = entry.el;
    if (op.x !== void 0) el.x = num(op.x, el.x);
    if (op.y !== void 0) el.y = num(op.y, el.y);
    if (op.w !== void 0) el.w = Math.max(12, num(op.w, el.w));
    if (op.h !== void 0) el.h = Math.max(8, num(op.h, el.h));
    if (op.state !== void 0 && (ELEMENT_STATES[el.type] || []).includes(op.state))
      el.state = op.state;
    if (isObj(op.props)) el.props = { ...el.props, ...clone(op.props) };
    return { op: index, kind, pageId: page.id, elementId: el.id };
  }
  if (kind === "delete_element") {
    const page = findPage(doc, op, index);
    const before = collectElementEntries(page.elements).length;
    page.elements = removeElementById(page.elements, op.elementId);
    if (collectElementEntries(page.elements).length === before)
      throw new Error(`op[${index}] delete_element: unknown element "${op.elementId}"`);
    return { op: index, kind, pageId: page.id, elementId: op.elementId };
  }
  if (kind === "group_elements") {
    const page = findPage(doc, op, index);
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
      id: newId("e"),
      type: "group",
      x: bounds.x - parentAbsX,
      y: bounds.y - parentAbsY,
      w: bounds.w,
      h: bounds.h,
      props: { name: str(op.name, "Group") }
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
  if (kind === "ungroup_elements") {
    const page = findPage(doc, op, index);
    const entry = findElementEntry(page.elements, op.elementId);
    if (!entry) throw new Error(`op[${index}] ungroup_elements: unknown element "${op.elementId}"`);
    if (entry.el.type !== "group")
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
function applyOps(rawDoc, ops) {
  if (!Array.isArray(ops)) throw new Error("operations must be an array");
  if (ops.length === 0) throw new Error("operations must not be empty");
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  const state = { lastContainerId: null };
  const results = ops.map((op, i) => applyOne(doc, op, i, state));
  if (!doc.activePageId && doc.pages.length) doc.activePageId = doc.pages[0].id;
  return { doc, results };
}
function repairDoc(rawDoc) {
  if (!isObj(rawDoc) || !Array.isArray(rawDoc.pages)) return { doc: rawDoc, changed: false };
  let changed = false;
  for (const page of rawDoc.pages) {
    if (!isObj(page) || !Array.isArray(page.elements) || page.elements.length === 0) continue;
    const frame = isObj(page.frame) ? page.frame : {};
    const ow = num(frame.w, 390);
    const oh = num(frame.h, 844);
    const b = elementsBounds(page.elements);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    if (!page.elements.some((e) => isContainerType(e.type)) && b.w >= ow * 0.4 && b.w < ow * 0.8) {
      const sx = ow / b.w;
      const sy = oh / b.h;
      page.elements = page.elements.map(
        (e) => scaleElementDeep(e, sx, sy, Math.min(sx, sy), b.minX, b.minY, true)
      );
      changed = true;
    }
  }
  return { doc: rawDoc, changed };
}
function summarizeDoc(rawDoc) {
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  return {
    name: doc.name,
    activePageId: doc.activePageId,
    pages: doc.pages.map((p) => {
      const entries = collectElementEntries(p.elements);
      return {
        id: p.id,
        name: p.name,
        frame: `${p.frame.w}\xD7${p.frame.h}`,
        elements: entries.length,
        containers: entries.filter((entry) => isContainerType(entry.el.type)).length
      };
    })
  };
}

// src/host/index.js
var API_PREFIX = "/dsh-product-design/api";
var MAX_BODY = 4 * 1024 * 1024;
var HEARTBEAT_MS = 15e3;
var GUIDANCE = [
  "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-product-design \u63D2\u4EF6\uFF1A\u4E00\u4E2A\u300C\u7B80\u5316\u7248 Figma\u300D\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03\uFF0C\u5BBF\u4E3B\u6743\u5A01\u3002",
  "\u6253\u5F00\u65B9\u5F0F\uFF1A\u4FA7\u8FB9\u680F\u300C\u4EA7\u54C1\u8BBE\u8BA1\u300D\u56FE\u6807\uFF1B\u6216\u76F4\u63A5\u7528 /design <\u9700\u6C42> \u8BA9 AI \u7ED8\u5236\u3002",
  "\u4F60\u53EF\u4EE5\u76F4\u63A5\u7528\u5DE5\u5177\u8BFB\u5199\u753B\u5E03\uFF0C\u4E0D\u9700\u8981\u7528\u6237\u5148\u6253\u5F00\u9762\u677F\uFF1A",
  "  product_design_get_document\uFF1A\u8BFB\u53D6\u9875\u9762/\u5143\u7D20/\u72B6\u6001\u3002",
  "  product_design_apply\uFF1A\u6309\u64CD\u4F5C\u589E\u5220\u6539\uFF08add_page / add_container / add_element / update_element / delete_element / group_elements / ungroup_elements / set_page_frame / clear_page / set_document_name \u7B49\uFF09\u3002",
  "\u753B\u5E03\u5750\u6807\u539F\u70B9\u5728\u6BCF\u9875\u5DE6\u4E0A\u89D2\uFF1B\u9ED8\u8BA4\u624B\u673A\u9875 390\xD7844\u3002\u5143\u7D20\u7C7B\u578B\uFF1Acontainer, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select\u3002",
  "\u5BB9\u5668\uFF08container\uFF09\u53EF\u4EE5\u5D4C\u5957\u5B50\u5143\u7D20\uFF1Aadd_element/add_container \u4F20 containerId \u5373\u53EF\u653E\u5165\u5BB9\u5668\uFF0C\u5B50\u5143\u7D20\u5750\u6807\u76F8\u5BF9\u5BB9\u5668\u5DE6\u4E0A\u89D2\uFF1B\u5BB9\u5668\u652F\u6301\u88C1\u526A\u5185\u5BB9\u3002",
  "props \u5E38\u7528\u952E\uFF1Atext\u3001color\u3001fontSize\u3001fontWeight\u3001radius\uFF1B\u5BB9\u5668\u8FD8\u53EF\u4F20 name\u3001background\u3001clipContent\u3002\u72B6\u6001\u89C1\u5404\u7C7B\u578B\uFF08\u5982 button: default/hover/active/disabled\uFF09\u3002",
  '\u64CD\u4F5C\u91CC\u9700\u8981\u9875\u9762\u65F6\u53EF\u7528 pageId\uFF0C\u6216\u7528 pageId:"@last" / pageIndex\uFF080\u57FA\uFF09\u6307\u5411\u540C\u4E00\u6B21 apply \u5185\u65B0\u5EFA\u7684\u9875\u9762\uFF0C\u65E0\u9700\u5148\u77E5\u9053 id\u3002',
  "\u5F53\u7528\u6237\u63D0\u51FA\u4EA7\u54C1\u8BBE\u8BA1/\u539F\u578B\u9700\u6C42\u65F6\uFF1A\u5148 get_document\uFF0C\u518D\u7528\u4E00\u6B21 apply \u6279\u91CF\u642D\u597D\u9875\u9762\u4E0E\u5143\u7D20\uFF1B\u7ED3\u679C\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u5BF9\u8BDD\u5185\u7684\u4EA7\u54C1\u9884\u89C8\u5361\u7247\u91CC\uFF0C\u7528\u6237\u4E5F\u53EF\u70B9\u4FA7\u8FB9\u680F\u300C\u4EA7\u54C1\u8BBE\u8BA1\u300D\u67E5\u770B\u5B8C\u6574\u753B\u5E03\u3002"
].join("\n");
var inject = ["webServer"];
function dshHome() {
  const raw = process.env.DSH_HOME;
  if (typeof raw === "string" && raw.trim() !== "") {
    const p = raw.trim();
    if (p === "~") return homedir();
    if (p.startsWith("~/")) return join(homedir(), p.slice(2));
    return p;
  }
  return join(homedir(), ".dsh");
}
function docFile() {
  return join(dshHome(), "storages", "dsh-product-design", "doc.json");
}
function createStore(file) {
  let revision = 0;
  let doc = null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object") {
      revision = Number(parsed.revision) || 0;
      doc = parsed.doc ?? null;
    }
  } catch {
  }
  const repaired = repairDoc(doc);
  if (repaired.changed) {
    doc = repaired.doc;
    revision += 1;
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ revision, doc }), "utf8");
    } catch {
    }
  }
  const subscribers = /* @__PURE__ */ new Set();
  function notify() {
    for (const fn of subscribers) {
      try {
        fn(revision);
      } catch {
      }
    }
  }
  function persist() {
    try {
      mkdirSync(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ revision, doc }), "utf8");
      renameSync(tmp, file);
    } catch {
    }
  }
  return {
    snapshot() {
      return { revision, doc };
    },
    setDoc(nextDoc, baseRevision) {
      if (typeof baseRevision === "number" && baseRevision !== revision) {
        return { ok: false, conflict: true, revision, doc };
      }
      revision += 1;
      doc = nextDoc ?? emptyDoc();
      persist();
      notify();
      return { ok: true, revision, doc };
    },
    apply(operations) {
      const out = applyOps(doc, operations);
      revision += 1;
      doc = out.doc;
      persist();
      notify();
      return { ok: true, revision, doc, results: out.results };
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}
function writeJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("body-too-large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid-json"));
      }
    });
    req.on("error", reject);
  });
}
function makeHandler(ctx, store) {
  return async function handle(req, res) {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = url.pathname;
      if (!pathname.startsWith(API_PREFIX)) {
        writeJson(res, 404, { ok: false, error: "not-found" });
        return;
      }
      try {
        const connection = ctx.get("connection");
        if (connection && typeof connection.requestRejection === "function") {
          const rejection = connection.requestRejection(req);
          if (rejection) {
            res.writeHead(rejection);
            res.end();
            return;
          }
        }
      } catch {
      }
      const sub = pathname.slice(API_PREFIX.length) || "/";
      if (sub === "/doc" && req.method === "GET") {
        writeJson(res, 200, store.snapshot());
        return;
      }
      if (sub === "/doc" && req.method === "POST") {
        const body = await readJson(req);
        const result = store.setDoc(body?.doc, body?.baseRevision);
        writeJson(res, result.conflict ? 409 : 200, result);
        return;
      }
      if (sub === "/apply" && req.method === "POST") {
        const body = await readJson(req);
        const result = store.apply(body?.operations);
        writeJson(res, 200, result);
        return;
      }
      if (sub === "/events" && req.method === "GET") {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive"
        });
        const push = () => res.write(`data: ${JSON.stringify({ revision: store.snapshot().revision })}

`);
        const unsubscribe = store.subscribe(push);
        const heartbeat = setInterval(() => {
          try {
            res.write(": ping\n\n");
          } catch {
          }
        }, HEARTBEAT_MS);
        const close = () => {
          clearInterval(heartbeat);
          unsubscribe();
        };
        req.once("close", close);
        res.once("close", close);
        push();
        return;
      }
      writeJson(res, 404, { ok: false, error: "not-found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, message === "body-too-large" ? 413 : 400, { ok: false, error: message });
    }
  };
}
function productPreviewMeta(store, results) {
  const snapshot = store.snapshot();
  const doc = ensureDoc(snapshot.doc ?? emptyDoc());
  const pageIds = Array.isArray(results) ? results.map((result) => result && result.pageId).filter(Boolean) : [];
  let page = null;
  for (let i = pageIds.length - 1; i >= 0 && !page; i -= 1) {
    page = doc.pages.find((candidate) => candidate.id === pageIds[i]) || null;
  }
  if (!page)
    page = doc.pages.find((candidate) => candidate.id === doc.activePageId) || doc.pages[0];
  if (!page) return null;
  const index = doc.pages.findIndex((candidate) => candidate.id === page.id);
  return {
    kind: "product-design",
    title: page.name || "Product design",
    pageId: page.id,
    pageIndex: index,
    pageCount: doc.pages.length,
    page: { id: page.id, name: page.name, frame: page.frame, elements: page.elements },
    revision: snapshot.revision
  };
}
function renderJson(_args, value) {
  return [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }];
}
function getDocumentTool(store) {
  return {
    name: "product_design_get_document",
    description: [
      "Read the host-authoritative product-design canvas document: its pages, each page frame size, and every element with position/size/state/props.",
      "Call this before editing, and after changes to verify the result. The document may be empty (no pages) on first use."
    ].join(" "),
    parameters: { type: "object", properties: {} },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: () => productPreviewMeta(store, [])
    },
    isConcurrencySafe: () => true,
    async execute() {
      const snap = store.snapshot();
      return { ok: true, revision: snap.revision, doc: snap.doc, summary: summarizeDoc(snap.doc) };
    }
  };
}
function applyTool(store) {
  return {
    name: "product_design_apply",
    description: [
      "Apply an ordered list of operations to the product-design canvas (a simplified Figma). The Host owns the document and broadcasts the result to the open canvas.",
      "Operations (each an object with `kind`):",
      "add_page {name?, preset?: mobile|tablet|desktop, width?, height?, background?} \u2192 pageId",
      "delete_page {pageId}; rename_page {pageId, name}; set_page_frame {pageId, preset?|width?, height?, background?}; clear_page {pageId}",
      'add_container {pageId?, containerId?, x?, y?, w?, h?, name?, background?, radius?, clipContent?} \u2192 elementId (a frame-like container; pass containerId (or "@last") to nest it)',
      'add_element {pageId?, containerId?, type, x?, y?, w?, h?, props?: {text,color,fontSize,fontWeight,radius}, state?} \u2192 elementId (containerId also accepts "@last" for the most recently added container in this apply)',
      "update_element {pageId?, elementId, x?, y?, w?, h?, state?, props?}; delete_element {pageId?, elementId}",
      "group_elements {pageId?, elementIds: string[]} \u2192 groupId; ungroup_elements {pageId?, elementId}",
      "set_document_name {name}",
      "Element types: container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.",
      "Container children use coordinates relative to the container; containers clip content by default. States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.",
      'Page targeting: any op that needs a page accepts pageId, or pageId: "@last" for the most recently added page, or pageIndex (0-based). This lets one apply call add a page then place elements on it without knowing its id.',
      "Returns generated page/element ids and the new revision. Prefer one apply call with several ops over many calls."
    ].join(" "),
    parameters: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: { type: "object" },
          description: "Array of operation objects (see the description for shapes)."
        }
      },
      required: ["operations"]
    },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: (_args, value) => productPreviewMeta(store, value && value.results)
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const result = store.apply(args?.operations);
      return {
        ok: result.ok,
        revision: result.revision,
        results: result.results,
        summary: summarizeDoc(result.doc)
      };
    }
  };
}
function newUserMessage(text) {
  const id = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "user" }
  };
}
function registerDesignCommand(ctx) {
  const install = (scope) => {
    const commands = scope && scope.commands || ctx.get("commands");
    if (!commands || typeof commands.register !== "function") return;
    const register = () => commands.register({
      name: "design",
      description: "\u63D0\u4EA4\u4EA7\u54C1\u8BBE\u8BA1\u9700\u6C42\uFF0C\u8BA9 AI \u5728\u753B\u5E03\u4E0A\u751F\u6210\u6216\u4FEE\u6539\u8BBE\u8BA1",
      input: { hint: "<\u9700\u6C42>" },
      recordInput: false,
      handler: ({ agent, rawInput }) => {
        const text = String(rawInput || "").trim();
        if (!text) return { kind: "error", text: "\u7528\u6CD5\uFF1A/design <\u4F60\u7684\u4EA7\u54C1\u8BBE\u8BA1\u9700\u6C42>" };
        if (!agent || typeof agent.followup !== "function") {
          return { kind: "error", text: "\u5F53\u524D\u4F1A\u8BDD\u4E0D\u652F\u6301\u76F4\u63A5\u63D0\u4EA4\u9700\u6C42\u3002" };
        }
        agent.followup(newUserMessage(text));
        return {
          kind: "success",
          text: "\u5DF2\u63D0\u4EA4\u8BBE\u8BA1\u9700\u6C42\uFF0CAI \u4F1A\u5728\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03\u4E0A\u5F00\u59CB\u7ED8\u5236\u3002"
        };
      }
    });
    if (typeof scope.effect === "function") {
      scope.effect(register, "dsh-product-design: /design command");
    } else {
      register();
    }
  };
  if (typeof ctx.inject === "function") ctx.inject(["commands"], install);
  else install(ctx);
}
function registerTools(ctx, store) {
  const install = (scope) => {
    const tools = scope && scope.tools || ctx.get("tools");
    if (!tools || typeof tools.register !== "function") return;
    scope.effect(() => {
      const disposers = [tools.register(getDocumentTool(store)), tools.register(applyTool(store))];
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch {
          }
        }
      };
    }, "dsh-product-design: agent tools");
  };
  if (typeof ctx.inject === "function") {
    ctx.inject(["tools"], install);
  } else {
    install(ctx);
  }
}
function registerPrompt(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["systemPrompt", "tools"], (scope) => {
    const prompt = scope && scope.systemPrompt || ctx.get("systemPrompt");
    if (!prompt || typeof prompt.section !== "function") return;
    scope.effect(
      () => prompt.section({ name: "plugin:dsh-product-design", order: 160, text: GUIDANCE }),
      "dsh-product-design: prompt section"
    );
  });
}
function apply(ctx) {
  const store = createStore(docFile());
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: API_PREFIX,
      handler: makeHandler(ctx, store)
    }),
    "dsh-product-design: host api"
  );
  registerTools(ctx, store);
  registerDesignCommand(ctx);
  registerPrompt(ctx);
}
export {
  apply,
  inject
};
