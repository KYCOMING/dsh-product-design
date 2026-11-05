window.__ModuleLoader__.load({
  id: 'dsh-product-design',
  factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

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
    const h2 = Math.max(0, Number(el.h) || 0);
    const absX = parentAbsX + x;
    const absY = parentAbsY + y;
    out.push({ el, parent, ancestors, list: elements, index, depth, absX, absY, w, h: h2 });
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
function descendantIds(el, out = []) {
  if (!el || !isContainer(el) || !Array.isArray(el.children)) return out;
  for (const child of el.children) {
    if (!child) continue;
    out.push(child.id);
    descendantIds(child, out);
  }
  return out;
}
function isUnderAny(entry, ancestorIds) {
  if (!entry || !Array.isArray(entry.ancestors) || !ancestorIds || !ancestorIds.length)
    return false;
  return entry.ancestors.some((id) => ancestorIds.indexOf(id) !== -1);
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
function pointInBox(x, y, box, pad = 0) {
  return !!box && x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad;
}
function findDropContainer(entries, excludeIds, x, y) {
  let best = null;
  for (const entry of entries) {
    if (!entry || entry.el.type !== "container") continue;
    if (excludeIds && excludeIds.has(entry.el.id)) continue;
    if (!pointInBox(x, y, { x: entry.absX, y: entry.absY, w: entry.w, h: entry.h })) continue;
    if (!best || entry.depth > best.depth) best = entry;
  }
  return best;
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
function replaceList(elements, oldList, newList) {
  if (elements === oldList) return newList;
  let changed = false;
  const out = elements.map((el) => {
    if (isContainer(el) && Array.isArray(el.children)) {
      const kids = replaceList(el.children, oldList, newList);
      if (kids !== el.children) {
        changed = true;
        return { ...el, children: kids };
      }
    }
    return el;
  });
  return changed ? out : elements;
}
function extractFromTree(elements, id) {
  let extracted = null;
  let changed = false;
  const walk = (list) => {
    const out = [];
    for (const el of list) {
      if (el.id === id) {
        extracted = el;
        changed = true;
        continue;
      }
      if (isContainer(el) && Array.isArray(el.children)) {
        const kids = walk(el.children);
        if (kids !== el.children) {
          out.push({ ...el, children: kids });
          continue;
        }
      }
      out.push(el);
    }
    return out;
  };
  const next = walk(elements);
  return { elements: changed ? next : elements, extracted };
}
function insertIntoTree(elements, targetId, node, position) {
  let inserted = false;
  const walk = (list) => {
    const out = [];
    for (const el of list) {
      if (el.id === targetId) {
        if (position === "inside" && isContainer(el)) {
          out.push({ ...el, children: [...el.children || [], node] });
        } else if (position === "before") {
          out.push(node, el);
        } else {
          out.push(el, node);
        }
        inserted = true;
        continue;
      }
      if (isContainer(el) && Array.isArray(el.children)) {
        const kids = walk(el.children);
        if (kids !== el.children) {
          out.push({ ...el, children: kids });
          continue;
        }
      }
      out.push(el);
    }
    return out;
  };
  const next = walk(elements);
  return inserted ? next : elements;
}
function moveElementInTree(elements, id, targetId, position) {
  if (!id || !targetId || id === targetId) return elements;
  const src = findElementEntry(elements, id);
  if (!src) return elements;
  if (isContainer(src.el) && descendantIds(src.el).includes(targetId)) return elements;
  const absX = src.absX;
  const absY = src.absY;
  const extracted = extractFromTree(elements, id);
  if (!extracted.extracted) return elements;
  const target = findElementEntry(extracted.elements, targetId);
  if (!target) return elements;
  if (position === "inside" && !isContainer(target.el)) return elements;
  const parentAbsX = position === "inside" ? target.absX : target.absX - target.el.x;
  const parentAbsY = position === "inside" ? target.absY : target.absY - target.el.y;
  const moved = {
    ...extracted.extracted,
    x: Math.round(absX - parentAbsX),
    y: Math.round(absY - parentAbsY)
  };
  return insertIntoTree(extracted.elements, targetId, moved, position);
}
function reorderInTree(elements, id, mode) {
  const entry = findElementEntry(elements, id);
  if (!entry) return elements;
  const list = entry.list;
  const from = entry.index;
  let to = from;
  if (mode === "front") to = list.length - 1;
  else if (mode === "back") to = 0;
  else if (mode === "forward") to = Math.min(list.length - 1, from + 1);
  else if (mode === "backward") to = Math.max(0, from - 1);
  if (to === from) return elements;
  const next = list.slice();
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el);
  return replaceList(elements, list, next);
}
function scaleElementsInTree(elements, sx, sy, sf, ox = 0, oy = 0, isRoot = true) {
  return elements.map((el) => {
    const props = { ...el.props || {} };
    if (typeof props.fontSize === "number")
      props.fontSize = Math.max(8, Math.round(props.fontSize * sf));
    if (typeof props.radius === "number") props.radius = Math.max(0, Math.round(props.radius * sf));
    const out = {
      ...el,
      x: Math.round((isRoot ? el.x - ox : el.x) * sx),
      y: Math.round((isRoot ? el.y - oy : el.y) * sy),
      w: Math.max(12, Math.round(el.w * sx)),
      h: Math.max(8, Math.round(el.h * sy)),
      props
    };
    if (isContainer(el) && Array.isArray(el.children)) {
      out.children = scaleElementsInTree(el.children, sx, sy, sf, 0, 0, false);
    }
    return out;
  });
}

// src/client/constants.js
var NS = "dsh-product-design";
var PANEL_ID = "dsh-product-design";
var STORAGE_KEY = "dsh-product-design:doc:v3";
var UI_KEY = "dsh-product-design:ui:v1";
var API_PREFIX = "/dsh-product-design/api";
var ACCENT = "#6366f1";
var TYPE_INFO = {
  container: {
    size: [320, 240],
    states: ["default"],
    hasText: false,
    hasColor: false,
    interactive: false,
    container: true
  },
  group: {
    size: [200, 120],
    states: ["default"],
    hasText: false,
    hasColor: false,
    interactive: false,
    container: true
  },
  button: {
    size: [132, 44],
    states: ["default", "hover", "active", "disabled"],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: true
  },
  input: {
    size: [260, 44],
    states: ["default", "focus", "filled", "error", "disabled"],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: true
  },
  card: {
    size: [300, 120],
    states: ["default", "hover"],
    hasText: true,
    hasColor: true,
    interactive: true
  },
  navbar: { size: [390, 56], states: ["default"], hasText: true, interactive: false },
  tabs: { size: [390, 48], states: ["default"], hasText: true, hasColor: true, interactive: true },
  toggle: { size: [48, 28], states: ["on", "off"], hasColor: true, interactive: true },
  checkbox: {
    size: [130, 24],
    states: ["unchecked", "checked"],
    hasText: true,
    hasColor: true,
    interactive: true
  },
  avatar: {
    size: [56, 56],
    states: ["default"],
    hasText: true,
    hasColor: true,
    interactive: false
  },
  text: {
    size: [200, 30],
    states: ["default"],
    hasText: true,
    hasColor: true,
    hasFont: true,
    interactive: false
  },
  image: { size: [300, 160], states: ["default"], hasColor: true, interactive: false },
  badge: { size: [64, 24], states: ["default"], hasText: true, hasColor: true, interactive: false },
  select: {
    size: [220, 44],
    states: ["default", "open", "disabled"],
    hasText: true,
    hasColor: true,
    interactive: true
  }
};
var LIB_ORDER = [
  "container",
  "button",
  "input",
  "card",
  "navbar",
  "tabs",
  "toggle",
  "checkbox",
  "avatar",
  "text",
  "image",
  "badge",
  "select"
];
function defaultState(type) {
  if (type === "toggle") return "on";
  if (type === "checkbox") return "unchecked";
  return "default";
}

// src/client/i18n.js
var import_react = require("react");
var APP_CTX = null;
function setAppCtx(ctx) {
  APP_CTX = ctx;
}
var DICT = {
  zh: {
    "entry.label": "\u4EA7\u54C1\u8BBE\u8BA1",
    "app.title": "\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03",
    "name.placeholder": "\u672A\u547D\u540D\u8BBE\u8BA1",
    "toolbar.preview": "\u9884\u89C8",
    "toolbar.edit": "\u7F16\u8F91",
    "toolbar.exitPreview": "\u9000\u51FA\u9884\u89C8 (Esc)",
    "toolbar.saved": "\u5DF2\u81EA\u52A8\u4FDD\u5B58",
    "toolbar.undo": "\u64A4\u9500 (\u2318Z)",
    "toolbar.redo": "\u91CD\u505A (\u21E7\u2318Z)",
    "toolbar.panHint": "\u7A7A\u683C / \u4E2D\u952E\u62D6\u62FD\u5E73\u79FB\u753B\u5E03",
    "toolbar.snap": "\u78C1\u5438",
    "frame.title": "\u753B\u5E03\u5C3A\u5BF8",
    "frame.mobile": "\u624B\u673A 390\xD7844",
    "frame.tablet": "\u5E73\u677F 768\xD71024",
    "frame.desktop": "\u684C\u9762 1280\xD7800",
    "state.normal": "\u6B63\u5E38",
    "state.loading": "\u52A0\u8F7D\u4E2D",
    "state.empty": "\u7A7A\u72B6\u6001",
    "state.error": "\u9519\u8BEF",
    "pages.title": "\u9875\u9762",
    "pages.add": "\u65B0\u589E\u9875",
    "pages.default": "\u9875\u9762",
    "pages.copySuffix": "\u526F\u672C",
    "pages.duplicate": "\u590D\u5236\u9875\u9762",
    "pages.delete": "\u5220\u9664\u9875\u9762",
    "pages.deleteConfirm": "\u786E\u5B9A\u5220\u9664\u8FD9\u4E2A\u9875\u9762\uFF1F\u9875\u9762\u4E0A\u7684\u7EC4\u4EF6\u4F1A\u4E00\u5E76\u5220\u9664\u3002",
    "library.title": "\u7EC4\u4EF6\u5E93",
    "library.hint": "\u70B9\u51FB\u6DFB\u52A0\u5230\u5F53\u524D\u9875\u9762",
    "inspector.title": "\u5C5E\u6027",
    "visualize.openCanvas": "\u6253\u5F00\u753B\u5E03",
    "inspector.collapse": "\u6536\u8D77\u5C5E\u6027\u680F",
    "inspector.expand": "\u5C55\u5F00\u5C5E\u6027\u680F",
    "inspector.frame": "\u753B\u5E03\u8BBE\u7F6E",
    "inspector.page": "\u9875\u9762",
    "inspector.pageName": "\u9875\u9762\u540D\u79F0",
    "inspector.empty": "\u9009\u4E2D\u4E00\u4E2A\u7EC4\u4EF6\u53EF\u7F16\u8F91\u5C5E\u6027\u3001\u5207\u6362\u72B6\u6001\uFF1B\u4E0D\u9009\u4E2D\u65F6\u53EF\u8BBE\u7F6E\u5F53\u524D\u9875\u9762\u3002",
    "inspector.text": "\u6587\u672C",
    "inspector.color": "\u989C\u8272",
    "inspector.position": "\u4F4D\u7F6E",
    "inspector.size": "\u5C3A\u5BF8",
    "inspector.radius": "\u5706\u89D2",
    "inspector.fontSize": "\u5B57\u53F7",
    "inspector.background": "\u80CC\u666F",
    "inspector.state": "\u72B6\u6001",
    "inspector.duplicate": "\u590D\u5236",
    "inspector.delete": "\u5220\u9664",
    "inspector.front": "\u7F6E\u9876",
    "inspector.back": "\u7F6E\u5E95",
    "inspector.multi": "\u5DF2\u9009\u591A\u4E2A\u56FE\u5C42",
    "inspector.align": "\u5BF9\u9F50",
    "inspector.group": "\u7F16\u7EC4 (\u2318G)",
    "inspector.ungroup": "\u53D6\u6D88\u7F16\u7EC4 (\u21E7\u2318G)",
    "inspector.container": "\u5BB9\u5668\u8BBE\u7F6E",
    "inspector.containerName": "\u5BB9\u5668\u540D",
    "inspector.clipContent": "\u88C1\u526A\u8D85\u51FA\u5185\u5BB9",
    "align.left": "\u5DE6\u5BF9\u9F50",
    "align.centerX": "\u6C34\u5E73\u5C45\u4E2D",
    "align.right": "\u53F3\u5BF9\u9F50",
    "align.top": "\u9876\u5BF9\u9F50",
    "align.centerY": "\u5782\u76F4\u5C45\u4E2D",
    "align.bottom": "\u5E95\u5BF9\u9F50",
    "align.distributeH": "\u6C34\u5E73\u5206\u5E03",
    "align.distributeV": "\u5782\u76F4\u5206\u5E03",
    "layers.title": "\u56FE\u5C42",
    "comp.container": "\u5BB9\u5668",
    "comp.group": "\u7F16\u7EC4",
    "comp.button": "\u6309\u94AE",
    "comp.input": "\u8F93\u5165\u6846",
    "comp.card": "\u5361\u7247",
    "comp.navbar": "\u5BFC\u822A\u680F",
    "comp.tabs": "\u6807\u7B7E\u9875",
    "comp.toggle": "\u5F00\u5173",
    "comp.checkbox": "\u590D\u9009\u6846",
    "comp.avatar": "\u5934\u50CF",
    "comp.text": "\u6587\u672C",
    "comp.image": "\u56FE\u7247",
    "comp.badge": "\u5FBD\u6807",
    "comp.select": "\u4E0B\u62C9\u6846",
    "sample.button": "\u6309\u94AE",
    "sample.placeholder": "\u8BF7\u8F93\u5165\u5185\u5BB9",
    "sample.filled": "\u5DF2\u8F93\u5165\u5185\u5BB9",
    "sample.card": "\u5361\u7247\u6807\u9898",
    "sample.cardSub": "\u652F\u6301\u62D6\u62FD\u3001\u7F29\u653E\u4E0E\u72B6\u6001\u5207\u6362",
    "sample.navbar": "\u9875\u9762\u6807\u9898",
    "sample.tabs": "\u63A8\u8350,\u5173\u6CE8,\u9644\u8FD1",
    "sample.checkbox": "\u8BB0\u4F4F\u6211",
    "sample.text": "\u6587\u672C\u5185\u5BB9",
    "sample.select": "\u8BF7\u9009\u62E9",
    "sample.opt1": "\u9009\u9879\u4E00",
    "sample.opt2": "\u9009\u9879\u4E8C",
    "sample.opt3": "\u9009\u9879\u4E09",
    "sample.welcome": "\u6B22\u8FCE\u56DE\u6765",
    "sample.welcomeSub": "\u4ECA\u5929\u60F3\u8BBE\u8BA1\u70B9\u4EC0\u4E48\uFF1F",
    "stateName.default": "\u9ED8\u8BA4",
    "stateName.hover": "\u60AC\u505C",
    "stateName.active": "\u6309\u4E0B",
    "stateName.disabled": "\u7981\u7528",
    "stateName.focus": "\u805A\u7126",
    "stateName.filled": "\u5DF2\u586B\u5199",
    "stateName.error": "\u9519\u8BEF",
    "stateName.open": "\u5C55\u5F00",
    "stateName.on": "\u5F00",
    "stateName.off": "\u5173",
    "stateName.checked": "\u9009\u4E2D",
    "stateName.unchecked": "\u672A\u9009",
    "overlay.loading": "\u6B63\u5728\u52A0\u8F7D\u2026",
    "overlay.emptyTitle": "\u8FD9\u91CC\u8FD8\u4EC0\u4E48\u90FD\u6CA1\u6709",
    "overlay.emptyDesc": "\u6DFB\u52A0\u7B2C\u4E00\u4E2A\u7EC4\u4EF6\uFF0C\u5F00\u59CB\u642D\u5EFA\u4F60\u7684\u9875\u9762",
    "overlay.emptyBtn": "\u65B0\u5EFA\u7EC4\u4EF6",
    "overlay.errorTitle": "\u51FA\u4E86\u70B9\u95EE\u9898",
    "overlay.errorDesc": "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5",
    "overlay.errorBtn": "\u91CD\u8BD5",
    "ctx.copy": "\u590D\u5236",
    "ctx.cut": "\u526A\u5207",
    "ctx.paste": "\u7C98\u8D34",
    "ctx.duplicate": "\u521B\u5EFA\u526F\u672C",
    "ctx.front": "\u7F6E\u4E8E\u9876\u5C42",
    "ctx.back": "\u7F6E\u4E8E\u5E95\u5C42",
    "ctx.forward": "\u4E0A\u79FB\u4E00\u5C42",
    "ctx.backward": "\u4E0B\u79FB\u4E00\u5C42",
    "ctx.group": "\u7F16\u7EC4",
    "ctx.ungroup": "\u53D6\u6D88\u7F16\u7EC4",
    "ctx.hide": "\u9690\u85CF",
    "ctx.show": "\u663E\u793A",
    "ctx.lock": "\u9501\u5B9A",
    "ctx.unlock": "\u89E3\u9501",
    "ctx.delete": "\u5220\u9664",
    "layers.search": "\u641C\u7D22\u56FE\u5C42\u2026",
    "layers.rename": "\u53CC\u51FB\u91CD\u547D\u540D",
    "layers.hide": "\u9690\u85CF\u56FE\u5C42",
    "layers.show": "\u663E\u793A\u56FE\u5C42",
    "layers.lock": "\u9501\u5B9A\u56FE\u5C42",
    "layers.unlock": "\u89E3\u9501\u56FE\u5C42",
    "layers.empty": "\u6CA1\u6709\u5339\u914D\u7684\u56FE\u5C42",
    "inspector.name": "\u56FE\u5C42\u540D",
    "inspector.opacity": "\u4E0D\u900F\u660E\u5EA6",
    "inspector.fontWeight": "\u5B57\u91CD",
    "inspector.textAlign": "\u5BF9\u9F50",
    "inspector.interactions": "\u4EA4\u4E92",
    "inspector.addInteraction": "\u6DFB\u52A0\u70B9\u51FB\u4EA4\u4E92",
    "inspector.removeInteraction": "\u5220\u9664\u4EA4\u4E92",
    "inspector.noInteractions": "\u8FD8\u6CA1\u6709\u4EA4\u4E92\u3002\u6DFB\u52A0\u540E\u53EF\u5728\u9884\u89C8\u91CC\u70B9\u51FB\u8DF3\u8F6C\u3002",
    "inspector.action": "\u52A8\u4F5C",
    "inspector.target": "\u76EE\u6807\u9875\u9762",
    "inspector.action.navigate": "\u8DF3\u8F6C\u5230\u9875\u9762",
    "inspector.action.back": "\u8FD4\u56DE\u4E0A\u4E00\u9875",
    "inspector.action.openOverlay": "\u6253\u5F00\u4E3A\u5F39\u5C42",
    "inspector.states": "\u9875\u9762\u72B6\u6001\u6587\u6848",
    "inspector.stateText": "\u63D0\u793A\u6587\u6848",
    "inspector.stateTitle": "\u6807\u9898",
    "inspector.stateDesc": "\u8BF4\u660E",
    "inspector.stateAction": "\u6309\u94AE\u6587\u6848",
    "inspector.scaleOnResize": "\u5207\u6362\u753B\u677F\u5C3A\u5BF8\u65F6\u7F29\u653E\u5185\u5BB9",
    "inspector.multiHint": "\u4FEE\u6539\u4F1A\u5E94\u7528\u5230\u5168\u90E8\u9009\u4E2D\u56FE\u5C42",
    "textEdit.hint": "Enter \u6362\u884C \xB7 Esc \u53D6\u6D88",
    "preview.back": "\u8FD4\u56DE",
    "preview.exit": "\u9000\u51FA\u9884\u89C8"
  },
  en: {
    "entry.label": "Product Design",
    "app.title": "Product Design Canvas",
    "name.placeholder": "Untitled design",
    "toolbar.preview": "Preview",
    "toolbar.edit": "Edit",
    "toolbar.exitPreview": "Exit preview (Esc)",
    "toolbar.saved": "Auto-saved",
    "toolbar.undo": "Undo (\u2318Z)",
    "toolbar.redo": "Redo (\u21E7\u2318Z)",
    "toolbar.panHint": "Hold Space / middle-drag to pan the canvas",
    "toolbar.snap": "Snap",
    "frame.title": "Frame size",
    "frame.mobile": "Phone 390\xD7844",
    "frame.tablet": "Tablet 768\xD71024",
    "frame.desktop": "Desktop 1280\xD7800",
    "state.normal": "Default",
    "state.loading": "Loading",
    "state.empty": "Empty",
    "state.error": "Error",
    "pages.title": "Pages",
    "pages.add": "Add page",
    "pages.default": "Page",
    "pages.copySuffix": "copy",
    "pages.duplicate": "Duplicate page",
    "pages.delete": "Delete page",
    "pages.deleteConfirm": "Delete this page? Its components will be removed too.",
    "library.title": "Components",
    "library.hint": "Click to add to the current page",
    "inspector.title": "Properties",
    "visualize.openCanvas": "Open canvas",
    "inspector.collapse": "Collapse properties",
    "inspector.expand": "Expand properties",
    "inspector.frame": "Frame settings",
    "inspector.page": "Page",
    "inspector.pageName": "Page name",
    "inspector.empty": "Select a component to edit properties and switch states; with nothing selected you can configure the current page.",
    "inspector.text": "Text",
    "inspector.color": "Color",
    "inspector.position": "Position",
    "inspector.size": "Size",
    "inspector.radius": "Radius",
    "inspector.fontSize": "Font size",
    "inspector.background": "Background",
    "inspector.state": "State",
    "inspector.duplicate": "Duplicate",
    "inspector.delete": "Delete",
    "inspector.front": "Bring front",
    "inspector.back": "Send back",
    "inspector.multi": "Multiple layers selected",
    "inspector.align": "Align",
    "inspector.group": "Group (\u2318G)",
    "inspector.ungroup": "Ungroup (\u21E7\u2318G)",
    "inspector.container": "Container settings",
    "inspector.containerName": "Container name",
    "inspector.clipContent": "Clip content",
    "align.left": "Align left",
    "align.centerX": "Center horizontally",
    "align.right": "Align right",
    "align.top": "Align top",
    "align.centerY": "Center vertically",
    "align.bottom": "Align bottom",
    "align.distributeH": "Distribute horizontally",
    "align.distributeV": "Distribute vertically",
    "layers.title": "Layers",
    "comp.container": "Container",
    "comp.group": "Group",
    "comp.button": "Button",
    "comp.input": "Input",
    "comp.card": "Card",
    "comp.navbar": "Navbar",
    "comp.tabs": "Tabs",
    "comp.toggle": "Toggle",
    "comp.checkbox": "Checkbox",
    "comp.avatar": "Avatar",
    "comp.text": "Text",
    "comp.image": "Image",
    "comp.badge": "Badge",
    "comp.select": "Select",
    "sample.button": "Button",
    "sample.placeholder": "Enter text",
    "sample.filled": "Typed value",
    "sample.card": "Card title",
    "sample.cardSub": "Drag, resize and switch states",
    "sample.navbar": "Page title",
    "sample.tabs": "Home,Explore,You",
    "sample.checkbox": "Remember me",
    "sample.text": "Text content",
    "sample.select": "Select an option",
    "sample.opt1": "Option one",
    "sample.opt2": "Option two",
    "sample.opt3": "Option three",
    "sample.welcome": "Welcome back",
    "sample.welcomeSub": "What will you design today?",
    "stateName.default": "Default",
    "stateName.hover": "Hover",
    "stateName.active": "Pressed",
    "stateName.disabled": "Disabled",
    "stateName.focus": "Focus",
    "stateName.filled": "Filled",
    "stateName.error": "Error",
    "stateName.open": "Open",
    "stateName.on": "On",
    "stateName.off": "Off",
    "stateName.checked": "Checked",
    "stateName.unchecked": "Unchecked",
    "overlay.loading": "Loading\u2026",
    "overlay.emptyTitle": "Nothing here yet",
    "overlay.emptyDesc": "Add your first component to start building",
    "overlay.emptyBtn": "Add component",
    "overlay.errorTitle": "Something went wrong",
    "overlay.errorDesc": "Check your connection and try again",
    "overlay.errorBtn": "Retry",
    "ctx.copy": "Copy",
    "ctx.cut": "Cut",
    "ctx.paste": "Paste",
    "ctx.duplicate": "Duplicate",
    "ctx.front": "Bring to front",
    "ctx.back": "Send to back",
    "ctx.forward": "Bring forward",
    "ctx.backward": "Send backward",
    "ctx.group": "Group",
    "ctx.ungroup": "Ungroup",
    "ctx.hide": "Hide",
    "ctx.show": "Show",
    "ctx.lock": "Lock",
    "ctx.unlock": "Unlock",
    "ctx.delete": "Delete",
    "layers.search": "Search layers\u2026",
    "layers.rename": "Double-click to rename",
    "layers.hide": "Hide layer",
    "layers.show": "Show layer",
    "layers.lock": "Lock layer",
    "layers.unlock": "Unlock layer",
    "layers.empty": "No matching layers",
    "inspector.name": "Layer name",
    "inspector.opacity": "Opacity",
    "inspector.fontWeight": "Weight",
    "inspector.textAlign": "Align",
    "inspector.interactions": "Interactions",
    "inspector.addInteraction": "Add click interaction",
    "inspector.removeInteraction": "Remove interaction",
    "inspector.noInteractions": "No interactions yet. Add one to navigate between pages in preview.",
    "inspector.action": "Action",
    "inspector.target": "Target page",
    "inspector.action.navigate": "Navigate to page",
    "inspector.action.back": "Go back",
    "inspector.action.openOverlay": "Open as overlay",
    "inspector.states": "Page state copy",
    "inspector.stateText": "Message",
    "inspector.stateTitle": "Title",
    "inspector.stateDesc": "Description",
    "inspector.stateAction": "Button label",
    "inspector.scaleOnResize": "Scale content when the frame resizes",
    "inspector.multiHint": "Changes apply to every selected layer",
    "textEdit.hint": "Enter for newline \xB7 Esc to cancel",
    "preview.back": "Back",
    "preview.exit": "Exit preview"
  }
};
function isZh(active) {
  return String(active || "").toLowerCase().indexOf("zh") === 0;
}
function pickDict(active, key) {
  const dict = isZh(active) ? DICT.zh : DICT.en;
  if (dict[key] != null) return dict[key];
  if (DICT.en[key] != null) return DICT.en[key];
  return key;
}
function activeLocale() {
  try {
    const loc = APP_CTX && APP_CTX.get("locale");
    return loc ? loc.getLocale().active : "zh";
  } catch (e) {
    return "zh";
  }
}
function useT() {
  const read = () => activeLocale();
  const [active, setActive] = (0, import_react.useState)(read);
  (0, import_react.useEffect)(() => {
    let loc = null;
    try {
      loc = APP_CTX && APP_CTX.get("locale");
    } catch (e) {
      loc = null;
    }
    if (!loc || typeof loc.subscribe !== "function") return void 0;
    setActive(loc.getLocale().active);
    return loc.subscribe(() => setActive(loc.getLocale().active));
  }, []);
  let bound = null;
  try {
    const loc = APP_CTX && APP_CTX.get("locale");
    if (loc) bound = loc.bind(NS);
  } catch (e) {
    bound = null;
  }
  return (0, import_react.useCallback)(
    (key) => {
      if (bound) {
        try {
          const out = bound(key);
          if (out && out !== key) return out;
        } catch (e) {
        }
      }
      return pickDict(active, key);
    },
    [active, bound]
  );
}

// src/client/react.js
var import_react2 = __toESM(require("react"), 1);
var h = import_react2.default.createElement;
var { useState: useState2, useEffect: useEffect2, useCallback: useCallback2, useRef } = import_react2.default;

// src/client/color.js
function hexToRgb(hex) {
  let s = String(hex || "").replace("#", "");
  if (s.length === 3)
    s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s, 16);
  if (isNaN(n)) return { r: 99, g: 102, b: 241 };
  return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
}
function shade(hex, p) {
  const { r, g, b } = hexToRgb(hex);
  const f = (t) => Math.max(0, Math.min(255, Math.round(p < 0 ? t + t * p : t + (255 - t) * p)));
  return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

// src/client/widgets.js
function renderWidget(el, state, t, opts) {
  opts = opts || {};
  const p = el.props || {};
  const acc = p.color || ACCENT;
  if (el.type === "container" || el.type === "group") {
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          borderRadius: el.type === "container" ? p.radius != null ? p.radius : 12 : 0,
          border: el.type === "container" ? "1.5px dashed rgba(99,102,241,.45)" : "1px dashed rgba(107,114,128,.45)",
          background: el.type === "container" ? p.background || "rgba(255,255,255,.6)" : "transparent",
          display: "flex",
          alignItems: "flex-start",
          padding: 8,
          overflow: "hidden"
        }
      },
      h(
        "span",
        {
          style: {
            fontSize: 11,
            color: "#6b7280",
            background: "rgba(255,255,255,.85)",
            borderRadius: 4,
            padding: "1px 4px",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        p.name || t("comp." + el.type)
      )
    );
  }
  if (el.type === "button") {
    let bg = acc;
    let fg = "#ffffff";
    let shadow = "none";
    if (state === "hover") bg = shade(acc, -0.08);
    else if (state === "active") {
      bg = shade(acc, -0.16);
      shadow = "inset 0 1px 3px rgba(0,0,0,.25)";
    } else if (state === "disabled") {
      bg = "#c9ccd4";
      fg = "#f7f8fa";
    }
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color: fg,
          borderRadius: p.radius != null ? p.radius : 8,
          fontWeight: 600,
          fontSize: p.fontSize || 14,
          boxShadow: shadow,
          transition: "background .15s ease",
          whiteSpace: "nowrap",
          overflow: "hidden",
          padding: "0 12px"
        }
      },
      p.text || t("sample.button")
    );
  }
  if (el.type === "input") {
    const focused = state === "focus";
    const err = state === "error";
    const dis = state === "disabled";
    const border = err ? "#e5484d" : focused ? acc : "#d6d9e2";
    const bgc = dis ? "#f4f5f7" : "#ffffff";
    const showValue = state === "filled";
    const txt = showValue ? p.text || t("sample.filled") : p.text || t("sample.placeholder");
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          boxSizing: "border-box",
          border: "1.5px solid " + border,
          borderRadius: p.radius != null ? p.radius : 8,
          background: bgc,
          color: showValue ? "#1a1d26" : "#9aa1ad",
          fontSize: p.fontSize || 14,
          boxShadow: focused ? "0 0 0 3px " + rgba(acc, 0.18) : "none",
          transition: "border-color .15s, box-shadow .15s",
          overflow: "hidden"
        }
      },
      h(
        "span",
        { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
        txt
      )
    );
  }
  if (el.type === "card") {
    const hover = state === "hover";
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          background: "#fff",
          border: "1px solid #eceef3",
          borderRadius: p.radius != null ? p.radius : 12,
          boxShadow: hover ? "0 10px 26px rgba(17,24,39,.14)" : "0 1px 3px rgba(17,24,39,.06)",
          transform: hover ? "translateY(-2px)" : "none",
          transition: "all .18s ease",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflow: "hidden"
        }
      },
      h(
        "div",
        {
          style: {
            fontSize: 15,
            fontWeight: 600,
            color: "#161a22",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        p.text || t("sample.card")
      ),
      h(
        "div",
        { style: { fontSize: 12.5, color: "#6b7280", lineHeight: 1.5, overflow: "hidden" } },
        t("sample.cardSub")
      ),
      h(
        "div",
        {
          style: {
            marginTop: "auto",
            height: 6,
            background: "#eef0f5",
            borderRadius: 999,
            overflow: "hidden"
          }
        },
        h("div", { style: { width: "62%", height: "100%", background: acc, borderRadius: 999 } })
      )
    );
  }
  if (el.type === "navbar") {
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          boxSizing: "border-box",
          background: "#fff",
          borderBottom: "1px solid #eceef3",
          gap: 8
        }
      },
      h(
        "div",
        {
          style: {
            fontSize: 16,
            fontWeight: 600,
            color: "#161a22",
            flex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis"
          }
        },
        p.text || t("sample.navbar")
      ),
      h(
        "svg",
        { width: 18, height: 18, viewBox: "0 0 16 16", fill: "#6b7280" },
        h("circle", { cx: 3, cy: 8, r: 1.4 }),
        h("circle", { cx: 8, cy: 8, r: 1.4 }),
        h("circle", { cx: 13, cy: 8, r: 1.4 })
      )
    );
  }
  if (el.type === "tabs") {
    const labels = (p.text || t("sample.tabs")).split(",").map((s) => s.trim());
    const activeIdx = opts.tabsActive != null ? opts.tabsActive : 0;
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid #eceef3",
          background: "#fff"
        }
      },
      labels.map(
        (lb, i) => h(
          "div",
          {
            key: i,
            style: {
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13.5,
              fontWeight: i === activeIdx ? 600 : 500,
              color: i === activeIdx ? acc : "#6b7280",
              borderBottom: i === activeIdx ? "2px solid " + acc : "2px solid transparent",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              overflow: "hidden"
            }
          },
          lb
        )
      )
    );
  }
  if (el.type === "toggle") {
    const on = state === "on";
    const kn = Math.max(12, (el.h || 26) - 6);
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          borderRadius: 999,
          background: on ? acc : "#d5d8df",
          position: "relative",
          transition: "background .18s ease"
        }
      },
      h("div", {
        style: {
          position: "absolute",
          top: 3,
          left: on ? "calc(100% - " + (kn + 3) + "px)" : "3px",
          width: kn,
          height: kn,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          transition: "left .18s ease"
        }
      })
    );
  }
  if (el.type === "checkbox") {
    const checked = state === "checked";
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflow: "hidden"
        }
      },
      h(
        "div",
        {
          style: {
            width: 20,
            height: 20,
            borderRadius: 5,
            background: checked ? acc : "#fff",
            border: checked ? "1.5px solid " + acc : "1.5px solid #c9ccd4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .15s"
          }
        },
        checked ? h(
          "svg",
          {
            width: 12,
            height: 12,
            viewBox: "0 0 12 12",
            fill: "none",
            stroke: "#fff",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          },
          h("path", { d: "M2 6l2.5 2.5L10 3" })
        ) : null
      ),
      h(
        "span",
        {
          style: {
            fontSize: 13.5,
            color: "#333a45",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        p.text || t("sample.checkbox")
      )
    );
  }
  if (el.type === "avatar") {
    const initial = (p.text || "U").trim().slice(0, 2).toUpperCase();
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "linear-gradient(135deg," + shade(acc, 0.15) + "," + acc + ")",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 600,
          fontSize: Math.max(12, Math.round((el.h || 48) * 0.34)),
          overflow: "hidden"
        }
      },
      initial
    );
  }
  if (el.type === "text") {
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          fontSize: p.fontSize || 18,
          fontWeight: p.fontWeight || 600,
          color: p.color || "#161a22",
          lineHeight: 1.3,
          whiteSpace: "pre-wrap",
          overflow: "hidden"
        }
      },
      p.text || t("sample.text")
    );
  }
  if (el.type === "image") {
    return h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          borderRadius: p.radius != null ? p.radius : 10,
          background: "repeating-linear-gradient(45deg,#eef0f5,#eef0f5 10px,#e6e9f0 10px,#e6e9f0 20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e6e9f0",
          overflow: "hidden"
        }
      },
      h(
        "svg",
        {
          width: "38%",
          height: "38%",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "#b3b9c6",
          strokeWidth: 1.6,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        },
        h("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
        h("circle", { cx: 8.5, cy: 9.5, r: 1.6 }),
        h("path", { d: "M4 18l5-5 4 4 3-3 4 4" })
      )
    );
  }
  if (el.type === "badge") {
    return h(
      "div",
      { style: { width: "100%", height: "100%", display: "flex", alignItems: "center" } },
      h(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            background: rgba(acc, 0.14),
            color: shade(acc, -0.12),
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".03em"
          }
        },
        p.text || "NEW"
      )
    );
  }
  if (el.type === "select") {
    const open = state === "open";
    const opts3 = [t("sample.opt1"), t("sample.opt2"), t("sample.opt3")];
    return h(
      "div",
      { style: { width: "100%", height: "100%", position: "relative" } },
      h(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            boxSizing: "border-box",
            border: "1.5px solid " + (open ? acc : "#d6d9e2"),
            borderRadius: 8,
            background: "#fff",
            fontSize: 14,
            color: "#333a45"
          }
        },
        h(
          "span",
          { style: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } },
          p.text || t("sample.select")
        ),
        h(
          "svg",
          {
            width: 12,
            height: 12,
            viewBox: "0 0 12 12",
            fill: "none",
            stroke: "#6b7280",
            strokeWidth: 1.6,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: { transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }
          },
          h("path", { d: "M2.5 4.5L6 8l3.5-3.5" })
        )
      ),
      open ? h(
        "div",
        {
          style: {
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #eceef3",
            borderRadius: 8,
            boxShadow: "0 10px 24px rgba(17,24,39,.14)",
            padding: 4,
            zIndex: 5
          }
        },
        opts3.map(
          (o, i) => h(
            "div",
            {
              key: i,
              style: {
                padding: "7px 10px",
                fontSize: 13.5,
                color: "#333a45",
                borderRadius: 5,
                background: i === 0 ? rgba(acc, 0.1) : "transparent"
              }
            },
            o
          )
        )
      ) : null
    );
  }
  return h("div", { style: { width: "100%", height: "100%" } });
}

// src/client/cards.js
var PRODUCT_DESIGN_META_KIND = "product-design";
var PRODUCT_DESIGN_TURN_KEY = "product-design";
var canvasOpener = () => {
};
function setCanvasOpener(fn) {
  canvasOpener = typeof fn === "function" ? fn : () => {
  };
}
function openCanvas() {
  try {
    canvasOpener();
  } catch (e) {
  }
}
function productDesignMetaFrom(meta) {
  if (!meta || typeof meta !== "object" || meta.kind !== PRODUCT_DESIGN_META_KIND) return null;
  if (!meta.page || typeof meta.page !== "object" || !meta.page.frame) return null;
  return meta;
}
function resultMeta(data) {
  return data && data.message && data.message.isError === true ? null : productDesignMetaFrom(data && data.meta);
}
function foldCard(cards, card) {
  if (cards.some((existing) => existing.callId === card.callId)) return cards;
  const index = cards.findIndex((existing) => existing.meta.pageId === card.meta.pageId);
  if (index === -1) return [...cards, card];
  return cards.map((existing, at) => at === index ? card : existing);
}
var turnCardsDefinition = {
  kind: PRODUCT_DESIGN_TURN_KEY,
  match: (event) => {
    if (event.type === "turn/start") return { id: String(event.data.turn), role: "start" };
    if (event.type !== "tool/result") return null;
    return resultMeta(event.data) ? { id: String(event.data.turn), role: "update" } : null;
  },
  start: (_context, match) => {
    if (match.event.type !== "turn/start") return null;
    return { turn: match.event.data.turn, cards: [] };
  },
  update: (context, match) => {
    if (match.event.type !== "tool/result") return context.state;
    const data = match.event.data;
    const meta = resultMeta(data);
    if (!meta) return context.state;
    const cards = foldCard(context.state.cards, {
      callId: String(data.message.source.callId),
      seq: match.event.seq,
      meta
    });
    return cards === context.state.cards ? context.state : { ...context.state, cards };
  },
  buildLocationData: (context, scope, previous) => {
    if (scope !== "turn" || context.state === void 0) return null;
    const { turn, cards } = context.state;
    if (previous && previous.kind === "turn" && previous.turn === turn && previous.key === PRODUCT_DESIGN_TURN_KEY && previous.value.cards === cards)
      return previous;
    return { kind: "turn", turn, key: PRODUCT_DESIGN_TURN_KEY, value: { cards } };
  }
};
function cardsBefore(turn, seq) {
  const cards = turn && turn.data && turn.data.get(PRODUCT_DESIGN_TURN_KEY)?.cards || [];
  return cards.filter((card) => card.seq < seq);
}
function selectTurnCards(owner) {
  if (!owner) return null;
  const cards = cardsBefore(owner.turn, owner.seq);
  return cards.length ? cards : null;
}
function renderMiniElements(elements, t) {
  return (elements || []).map((el) => {
    if (el.hidden) return null;
    const isBox = isContainerType(el.type);
    const style = {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.w,
      height: el.h,
      boxSizing: "border-box",
      opacity: el.opacity == null ? 1 : el.opacity
    };
    if (isBox && el.type === "container") {
      style.background = el.props && el.props.background || "#ffffff";
      style.borderRadius = el.props && el.props.radius != null ? el.props.radius : 12;
      style.overflow = el.props && el.props.clipContent === false ? "visible" : "hidden";
    }
    return h(
      "div",
      { key: el.id, style },
      isBox ? renderMiniElements(el.children, t) : h(
        "div",
        { style: { width: "100%", height: "100%", pointerEvents: "none" } },
        renderWidget(el, el.state || defaultState(el.type), t, {})
      )
    );
  });
}
function ProductPagePreview(props) {
  const t = useT();
  const page = props.page;
  const frame = page.frame || { w: 390, h: 844, background: "#ffffff" };
  const maxW = props.maxWidth || 520;
  const maxH = props.maxHeight || 520;
  const scale = Math.min(maxW / Math.max(1, frame.w), maxH / Math.max(1, frame.h), 1);
  return h(
    "div",
    {
      style: {
        width: Math.max(1, Math.round(frame.w * scale)),
        height: Math.max(1, Math.round(frame.h * scale)),
        overflow: "hidden",
        borderRadius: 12,
        background: frame.background || "#ffffff",
        boxShadow: "0 8px 28px rgba(17,24,39,.12), 0 0 0 1px rgba(17,24,39,.05)",
        flexShrink: 0
      }
    },
    h(
      "div",
      {
        style: {
          width: frame.w,
          height: frame.h,
          position: "relative",
          transform: "scale(" + scale + ")",
          transformOrigin: "top left",
          background: frame.background || "#ffffff"
        }
      },
      renderMiniElements(page.elements || [], t)
    )
  );
}
function ProductDesignCard(props) {
  const t = useT();
  const meta = props.meta;
  const page = meta.page || {};
  const frame = page.frame || { w: 390, h: 844 };
  const count = meta.pageCount || 1;
  const index = meta.pageIndex != null ? meta.pageIndex + 1 : 1;
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: 14,
        border: "1px solid var(--dsw-alias-border-l1,#e5e6eb)",
        background: "var(--dsw-alias-bg-base,#ffffff)",
        color: "var(--dsw-alias-label-primary,#111827)",
        boxShadow: "0 1px 3px rgba(17,24,39,.05)",
        maxWidth: "100%",
        boxSizing: "border-box"
      }
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }
      },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
        h(
          "div",
          {
            style: {
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          },
          meta.title || page.name || t("app.title")
        ),
        h(
          "div",
          { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary,#6b7280)" } },
          `${frame.w}\xD7${frame.h}${count > 1 ? ` \xB7 ${index}/${count}` : ""}`
        )
      ),
      h(
        "button",
        {
          type: "button",
          onClick: openCanvas,
          style: {
            border: "1px solid var(--dsw-alias-border-l2,#d6d9e2)",
            background: "var(--dsw-alias-bg-layer-1,#fafafa)",
            color: "inherit",
            borderRadius: 7,
            padding: "5px 10px",
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }
        },
        t("visualize.openCanvas")
      )
    ),
    h(
      "div",
      { style: { display: "flex", justifyContent: "center", maxWidth: "100%", overflow: "auto" } },
      h(ProductPagePreview, { page, maxWidth: 520, maxHeight: 520 })
    )
  );
}
function ProductDesignCards(props) {
  const cards = cardsBefore(props.turn, props.seq);
  if (!cards.length) return null;
  return h(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gap: 12,
        margin: "8px 0 4px"
      }
    },
    cards.map((card) => h(ProductDesignCard, { key: card.callId, meta: card.meta }))
  );
}
function registerProductDesignCards(ctx) {
  const disposers = [];
  try {
    if (ctx && ctx.slots && typeof ctx.slots.inject === "function") {
      disposers.push(
        ctx.slots.inject(
          "conversation.chat.turnTail",
          () => ctx.slots.register(
            {
              name: "conversation.chat.turnTail",
              id: "dsh-product-design-cards",
              order: 110,
              priority: 110,
              select: selectTurnCards
            },
            ProductDesignCards
          )
        )
      );
    }
  } catch (e) {
  }
  try {
    if (ctx && typeof ctx.inject === "function") {
      ctx.inject(["uiConversation"], (scope) => {
        const service = scope.get("uiConversation");
        if (service && service.events && typeof service.events.register === "function") {
          const dispose = service.events.register(turnCardsDefinition);
          if (typeof dispose === "function") disposers.push(dispose);
        }
      });
    }
  } catch (e) {
  }
  return () => {
    for (const dispose of disposers.splice(0)) {
      try {
        dispose();
      } catch (e) {
      }
    }
  };
}

// src/client/icons.js
function Svg(props) {
  const { size, children, ...rest } = props;
  return h(
    "svg",
    Object.assign(
      {
        width: size || 14,
        height: size || 14,
        viewBox: "0 0 16 16",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true
      },
      rest
    ),
    children
  );
}
var IconPlus = () => h(Svg, null, h("path", { d: "M8 3v10M3 8h10" }));
var IconMinus = () => h(Svg, null, h("path", { d: "M3 8h10" }));
var IconEye = () => h(
  Svg,
  null,
  h("path", { d: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" }),
  h("circle", { cx: 8, cy: 8, r: 1.8 })
);
var IconPencil = () => h(Svg, null, h("path", { d: "M11 2.5l2.5 2.5L5 13.5 2 14l.5-3L11 2.5z" }));
var IconTrash = () => h(Svg, null, h("path", { d: "M2.5 4h11M6 4V2.5h4V4M4 4l.6 9h6.8L12 4" }));
var IconCopy = () => h(
  Svg,
  null,
  h("rect", { x: 5, y: 5, width: 8, height: 8, rx: 1.4 }),
  h("path", { d: "M3 11V4a1 1 0 0 1 1-1h7" })
);
var IconFront = () => h(
  Svg,
  null,
  h("rect", { x: 3, y: 3, width: 8, height: 8, rx: 1.2 }),
  h("path", { d: "M8 8h5v5" })
);
var IconBack = () => h(
  Svg,
  null,
  h("rect", { x: 5, y: 5, width: 8, height: 8, rx: 1.2 }),
  h("path", { d: "M3 8V3h5" })
);
var IconUndo = () => h(Svg, null, h("path", { d: "M3.2 8.4a5 5 0 1 1 1.5 3.3M3 4.6V8h3.4" }));
var IconRedo = () => h(Svg, null, h("path", { d: "M12.8 8.4a5 5 0 1 0-1.5 3.3M13 4.6V8H9.6" }));
var IconPages = () => h(
  Svg,
  null,
  h("rect", { x: 3, y: 1.8, width: 10, height: 12.4, rx: 1.6 }),
  h("path", { d: "M3 5.2h10M5.4 8.2h5.2M5.4 10.8h3.4" })
);
var IconComponents = () => h(
  Svg,
  null,
  h("rect", { x: 2, y: 2, width: 5, height: 5, rx: 1 }),
  h("rect", { x: 9, y: 2, width: 5, height: 5, rx: 1 }),
  h("rect", { x: 2, y: 9, width: 5, height: 5, rx: 1 }),
  h("rect", { x: 9, y: 9, width: 5, height: 5, rx: 1 })
);
var IconLayers = () => h(
  Svg,
  null,
  h("path", { d: "M8 2l6 3-6 3-6-3 6-3z" }),
  h("path", { d: "M2 8l6 3 6-3M2 11l6 3 6-3" })
);
var IconMagnet = () => h(
  Svg,
  null,
  h("path", { d: "M3 2v6a5 5 0 0 0 10 0V2" }),
  h("path", { d: "M3 2H1.5M13 2h1.5M3 6h3M10 6h3" })
);
function libGlyph(type) {
  const map = {
    container: h("path", { d: "M2 3.5h12v9H2zM4.5 6h7v4h-7z" }),
    group: h("path", { d: "M2.5 2.5h5v5h-5zM8.5 8.5h5v5h-5z" }),
    button: h("rect", { x: 2, y: 5, width: 12, height: 6, rx: 2 }),
    input: h("rect", { x: 2, y: 4.5, width: 12, height: 7, rx: 1.6 }),
    card: h("rect", { x: 2, y: 3, width: 12, height: 10, rx: 1.6 }),
    navbar: h("path", { d: "M2 4h12M2 4v8h12V4M6 7h4" }),
    tabs: h("path", { d: "M2 5h12M5 5v6M10 5v6" }),
    toggle: h("rect", { x: 2, y: 5, width: 12, height: 6, rx: 3 }),
    checkbox: h("rect", { x: 3, y: 3, width: 10, height: 10, rx: 2 }),
    avatar: h("circle", { cx: 8, cy: 8, r: 5 }),
    text: h("path", { d: "M3 4h10M8 4v8M5.5 12h5" }),
    image: h("rect", { x: 2, y: 3, width: 12, height: 10, rx: 1.6 }),
    badge: h("rect", { x: 2, y: 6, width: 12, height: 4, rx: 2 }),
    select: h("path", { d: "M2 4.5h12v7H2zM10 8l1.5 1.5L13 8" })
  };
  return map[type] || map.text;
}
function ProductDesignIcon(props) {
  const size = props && props.size;
  return h(
    "svg",
    {
      viewBox: "0 0 16 16",
      width: size || 16,
      height: size || 16,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      "data-dsh-panel-entry": PANEL_ID
    },
    h("rect", { x: 1.5, y: 2, width: 13, height: 11.5, rx: 2 }),
    h("path", { d: "M1.5 5.4h13" }),
    h("rect", { x: 3.6, y: 8, width: 4, height: 3.2, rx: 0.6 }),
    h("circle", { cx: 10.6, cy: 9.6, r: 1.4 })
  );
}

// src/shared/snapping.js
var SNAP_THRESHOLD = 5;
function xCandidates(targets) {
  const out = [];
  for (const t of targets) {
    out.push({ pos: t.x, target: t, kind: "left" });
    out.push({ pos: t.x + t.w / 2, target: t, kind: "centerX" });
    out.push({ pos: t.x + t.w, target: t, kind: "right" });
  }
  return out;
}
function yCandidates(targets) {
  const out = [];
  for (const t of targets) {
    out.push({ pos: t.y, target: t, kind: "top" });
    out.push({ pos: t.y + t.h / 2, target: t, kind: "centerY" });
    out.push({ pos: t.y + t.h, target: t, kind: "bottom" });
  }
  return out;
}
function bestSnap(movingPositions, candidates, threshold) {
  let best = null;
  for (const moving of movingPositions) {
    for (const cand of candidates) {
      const delta = cand.pos - moving.pos;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, candidate: cand, moving };
      }
    }
  }
  return best;
}
function span(aStart, aEnd, bStart, bEnd) {
  return { from: Math.min(aStart, bStart), to: Math.max(aEnd, bEnd) };
}
function snapMoveBox(box, targets, threshold = SNAP_THRESHOLD) {
  const xs = xCandidates(targets);
  const ys = yCandidates(targets);
  const movingX = [
    { pos: box.x, edge: "left" },
    { pos: box.x + box.w / 2, edge: "centerX" },
    { pos: box.x + box.w, edge: "right" }
  ];
  const movingY = [
    { pos: box.y, edge: "top" },
    { pos: box.y + box.h / 2, edge: "centerY" },
    { pos: box.y + box.h, edge: "bottom" }
  ];
  const sx = bestSnap(movingX, xs, threshold);
  const sy = bestSnap(movingY, ys, threshold);
  const dx = sx ? sx.delta : 0;
  const dy = sy ? sy.delta : 0;
  const guides = [];
  if (sx) {
    const t = sx.candidate.target;
    const v = span(box.y + dy, box.y + box.h + dy, t.y, t.y + t.h);
    guides.push({ axis: "x", pos: sx.candidate.pos, from: v.from, to: v.to });
  }
  if (sy) {
    const t = sy.candidate.target;
    const h2 = span(box.x + dx, box.x + box.w + dx, t.x, t.x + t.w);
    guides.push({ axis: "y", pos: sy.candidate.pos, from: h2.from, to: h2.to });
  }
  return { dx, dy, guides };
}
function snapResizeBox(box, dir, targets, threshold = SNAP_THRESHOLD) {
  const xCands = xCandidates(targets);
  const yCands = yCandidates(targets);
  const next = { ...box };
  const guides = [];
  const snapEdge = (value, candidates, axis, spanStart, spanEnd, targetSpan) => {
    let best = null;
    for (const cand of candidates) {
      const delta = cand.pos - value;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, candidate: cand };
    }
    if (!best) return null;
    const t = best.candidate.target;
    const s = targetSpan(t);
    const v = span(spanStart, spanEnd, s.start, s.end);
    guides.push({ axis, pos: best.candidate.pos, from: v.from, to: v.to });
    return best.delta;
  };
  if (dir.indexOf("w") !== -1) {
    const d = snapEdge(next.x, xCands, "x", next.y, next.y + next.h, (t) => ({
      start: t.y,
      end: t.y + t.h
    }));
    if (d != null) {
      next.x += d;
      next.w -= d;
    }
  }
  if (dir.indexOf("e") !== -1) {
    const d = snapEdge(next.x + next.w, xCands, "x", next.y, next.y + next.h, (t) => ({
      start: t.y,
      end: t.y + t.h
    }));
    if (d != null) next.w += d;
  }
  if (dir.indexOf("n") !== -1) {
    const d = snapEdge(next.y, yCands, "y", next.x, next.x + next.w, (t) => ({
      start: t.x,
      end: t.x + t.w
    }));
    if (d != null) {
      next.y += d;
      next.h -= d;
    }
  }
  if (dir.indexOf("s") !== -1) {
    const d = snapEdge(next.y + next.h, yCands, "y", next.x, next.x + next.w, (t) => ({
      start: t.x,
      end: t.x + t.w
    }));
    if (d != null) next.h += d;
  }
  if (next.w < 12) {
    if (dir.indexOf("w") !== -1) next.x -= 12 - next.w;
    next.w = 12;
  }
  if (next.h < 8) {
    if (dir.indexOf("n") !== -1) next.y -= 8 - next.h;
    next.h = 8;
  }
  return { box: next, guides };
}

// src/client/model.js
var __seq = 1;
function uid() {
  return "e" + Date.now().toString(36) + (__seq++).toString(36);
}
function makeEl(type, x, y, w, hh, props, state) {
  const el = {
    id: uid(),
    type,
    name: "",
    x,
    y,
    w,
    h: hh,
    hidden: false,
    locked: false,
    opacity: 1,
    state: state || defaultState(type),
    props: props || {},
    interactions: []
  };
  if (isContainerType(type)) el.children = [];
  return el;
}
function emptyStates() {
  return {
    loading: { text: "" },
    empty: { title: "", desc: "", action: "" },
    error: { title: "", desc: "", action: "" }
  };
}
function starterElements(t) {
  return [
    makeEl("navbar", 0, 0, 390, 56),
    makeEl("text", 24, 84, 320, 30, { fontSize: 22, text: t ? t("sample.welcome") : "\u6B22\u8FCE\u56DE\u6765" }),
    makeEl("text", 24, 120, 320, 22, {
      fontSize: 13,
      fontWeight: 400,
      color: "#6b7280",
      text: t ? t("sample.welcomeSub") : "\u4ECA\u5929\u60F3\u8BBE\u8BA1\u70B9\u4EC0\u4E48\uFF1F"
    }),
    makeEl("card", 24, 158, 342, 116),
    makeEl("input", 24, 296, 342, 44),
    makeEl("button", 24, 356, 150, 44),
    makeEl("toggle", 300, 364, 50, 28),
    makeEl("badge", 24, 420, 70, 24),
    makeEl("tabs", 0, 470, 390, 48),
    makeEl("image", 24, 540, 342, 160)
  ];
}
function defaultDoc(t) {
  const page = {
    id: uid(),
    name: t ? t("pages.default") + " 1" : "Page 1",
    frame: { w: 390, h: 844, preset: "mobile", background: "#ffffff" },
    states: emptyStates(),
    elements: starterElements(t)
  };
  return { name: "", pages: [page], activePageId: page.id };
}
function normalizeInteractions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (!["navigate", "back", "openOverlay"].includes(item.action)) continue;
    const next = { trigger: "click", action: item.action };
    if (item.action !== "back") next.targetPageId = String(item.targetPageId || "");
    out.push(next);
  }
  return out;
}
function normalizeStates(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const pick = (key, fields) => {
    const value = src[key] && typeof src[key] === "object" ? src[key] : {};
    const out = {};
    for (const field of fields) out[field] = typeof value[field] === "string" ? value[field] : "";
    return out;
  };
  return {
    loading: pick("loading", ["text"]),
    empty: pick("empty", ["title", "desc", "action"]),
    error: pick("error", ["title", "desc", "action"])
  };
}
function normalizeElement(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = TYPE_INFO[raw.type] ? raw.type : "text";
  const el = {
    id: raw.id || uid(),
    type,
    name: typeof raw.name === "string" ? raw.name : "",
    x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0,
    y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0,
    w: Math.max(12, Number.isFinite(Number(raw.w)) ? Number(raw.w) : TYPE_INFO[type].size[0]),
    h: Math.max(8, Number.isFinite(Number(raw.h)) ? Number(raw.h) : TYPE_INFO[type].size[1]),
    hidden: raw.hidden === true,
    locked: raw.locked === true,
    opacity: Number.isFinite(Number(raw.opacity)) ? Math.max(0, Math.min(1, Number(raw.opacity))) : 1,
    state: raw.state || defaultState(type),
    props: raw.props && typeof raw.props === "object" ? { ...raw.props } : {},
    interactions: normalizeInteractions(raw.interactions)
  };
  if (isContainerType(type)) {
    el.children = Array.isArray(raw.children) ? raw.children.map(normalizeElement).filter(Boolean) : [];
  }
  return el;
}
function normalizeElements(list) {
  return Array.isArray(list) ? list.map(normalizeElement).filter(Boolean) : [];
}
function normalizeDoc(doc) {
  if (!doc || !Array.isArray(doc.pages)) return null;
  const pages = doc.pages.filter((p) => p && Array.isArray(p.elements)).map((p) => {
    const fr = p.frame || {};
    return {
      id: p.id || uid(),
      name: p.name || "Page",
      frame: {
        w: fr.w || 390,
        h: fr.h || 844,
        preset: fr.preset || "mobile",
        background: fr.background || "#ffffff"
      },
      states: normalizeStates(p.states),
      elements: normalizeElements(p.elements)
    };
  });
  if (!pages.length) return null;
  const activePageId = pages.some((p) => p.id === doc.activePageId) ? doc.activePageId : pages[0].id;
  return { name: doc.name || "", pages, activePageId };
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
  }
}
function apiFetch(path, init, sessionId) {
  if (typeof fetch !== "function") return Promise.resolve(null);
  let target = API_PREFIX + path;
  if (sessionId) {
    target += (target.includes("?") ? "&" : "?") + "sessionId=" + encodeURIComponent(sessionId);
  }
  let url;
  try {
    url = new URL(
      target,
      window.location && window.location.href ? window.location.href : "http://localhost/"
    ).toString();
  } catch (e) {
    return Promise.resolve(null);
  }
  const opts = Object.assign({}, init);
  if (!opts.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    try {
      opts.signal = AbortSignal.timeout(4e3);
    } catch (e) {
    }
  }
  return fetch(url, opts).then(
    (res) => res.text().then((text) => {
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
    () => null
  );
}

// src/client/session.js
var adapter = null;
var adapterListeners = /* @__PURE__ */ new Set();
function setSessionSource(next) {
  adapter = next && typeof next === "object" ? next : null;
  for (const listener of adapterListeners) {
    try {
      listener();
    } catch (e) {
    }
  }
}
function currentSessionId() {
  try {
    const current = adapter && adapter.current;
    const snapshot = current && typeof current.getSnapshot === "function" ? current.getSnapshot() : null;
    return snapshot && typeof snapshot.key === "string" ? snapshot.key : "";
  } catch (e) {
    return "";
  }
}
function useSessionId() {
  const [id, setId] = useState2(currentSessionId);
  useEffect2(() => {
    let unsubscribe = null;
    const attach = () => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (e) {
        }
      }
      unsubscribe = null;
      setId(currentSessionId());
      try {
        const current = adapter && adapter.current;
        if (current && typeof current.subscribe === "function") {
          unsubscribe = current.subscribe(() => setId(currentSessionId()));
        }
      } catch (e) {
      }
    };
    adapterListeners.add(attach);
    attach();
    return () => {
      adapterListeners.delete(attach);
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (e) {
        }
      }
    };
  }, []);
  return id;
}

// src/client/styles.js
var CSS = [
  ".dpd-root{position:relative;display:flex;flex-direction:column;height:100%;width:100%;min-height:0;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);font-size:13px;font-family:inherit;overflow:hidden}",
  ".dpd-root *{box-sizing:border-box}",
  ".dpd-root button,.dpd-root input,.dpd-root select{font-family:inherit}",
  ".dpd-toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-layer-1,#fafafa);flex-wrap:wrap;flex-shrink:0}",
  ".dpd-brand{display:flex;align-items:center;gap:7px;font-weight:600;font-size:13.5px;margin-right:2px;color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-nameInput{background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 7px;color:inherit;font:inherit;font-weight:600;width:150px;max-width:26vw}",
  ".dpd-nameInput:hover{border-color:var(--dsw-alias-border-l1,#e5e6eb)}",
  ".dpd-nameInput:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#6366f1);background:var(--dsw-alias-bg-base,#fff)}",
  ".dpd-spacer{flex:1}",
  ".dpd-select{background:var(--dsw-alias-bg-base,#fff);color:inherit;border:1px solid var(--dsw-alias-border-l2,#d6d9e2);border-radius:7px;padding:5px 8px;font:inherit;font-size:12px;cursor:pointer}",
  ".dpd-select:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-seg{display:inline-flex;background:var(--dsw-alias-bg-layer-2,#f0f1f4);border-radius:8px;padding:2px;gap:2px}",
  ".dpd-seg button{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);padding:4px 9px;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;white-space:nowrap}",
  ".dpd-seg button.active{background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);box-shadow:0 1px 2px rgba(0,0,0,.08);font-weight:600}",
  ".dpd-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2,#d6d9e2);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);padding:5px 10px;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;white-space:nowrap}",
  ".dpd-btn:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4)}",
  ".dpd-btn.primary{background:var(--dsw-alias-brand-primary,#6366f1);color:#fff;border-color:transparent}",
  ".dpd-btn.primary:hover{filter:brightness(1.06)}",
  ".dpd-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--dsw-alias-border-l2,#d6d9e2);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);border-radius:7px;cursor:pointer;padding:0}",
  ".dpd-iconbtn:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4)}",
  ".dpd-mini{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:5px;cursor:pointer;padding:0;flex-shrink:0}",
  ".dpd-mini:hover{border-color:var(--dsw-alias-brand-primary,#6366f1);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-zoom{min-width:42px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);font-variant-numeric:tabular-nums;background:transparent;border:none;cursor:pointer;padding:2px 4px;border-radius:6px}",
  ".dpd-zoom:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-saved{font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap}",
  ".dpd-body{flex:1;display:flex;min-height:0}",
  ".dpd-leftcol{display:flex;min-height:0;flex-shrink:0;background:var(--dsw-alias-bg-layer-1,#fafafa);border-right:1px solid var(--dsw-alias-border-l1,#e5e6eb)}",
  ".dpd-rail{width:44px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;border-right:1px solid var(--dsw-alias-border-l1,#e5e6eb)}",
  ".dpd-railbtn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;border-radius:8px;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;padding:0}",
  ".dpd-railbtn:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-railbtn.active{background:var(--dsw-alias-bg-layer-2,#f0f1f4);color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-sectionwrap{position:relative;display:flex;flex-direction:column;min-height:0;overflow:hidden}",
  ".dpd-sectionBody{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}",
  ".dpd-resizer{position:absolute;top:0;right:0;width:6px;height:100%;cursor:col-resize;z-index:6}",
  ".dpd-resizer.left{left:0;right:auto}",
  ".dpd-resizer:hover{background:var(--dsw-alias-border-l2,#d6d9e2)}",
  ".dpd-right{position:relative;width:242px;max-width:36%;flex-shrink:0;border-left:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-layer-1,#fafafa);display:flex;flex-direction:column;min-height:0;overflow:auto}",
  ".dpd-right.collapsed{width:38px;min-width:38px;max-width:none;align-items:center;padding-top:8px;overflow:hidden}",
  ".dpd-rightToggle{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:8px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;font:inherit;font-size:15px}",
  ".dpd-rightToggle:hover{border-color:var(--dsw-alias-brand-primary,#6366f1);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-panelTitle{padding:10px 12px 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#6b7280);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:6px}",
  ".dpd-hint{padding:0 12px 8px;font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280)}",
  ".dpd-pages{display:flex;flex-direction:column;gap:1px;padding:0 8px 8px;overflow-y:auto;overflow-x:hidden;flex:1;min-height:0}",
  ".dpd-pageRow{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-pageRow:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4)}",
  ".dpd-pageRow.active{background:var(--dsw-alias-bg-layer-2,#f0f1f4);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-pageRow .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".dpd-pageRow .sz{font-size:10px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap}",
  ".dpd-libScroll{overflow-y:auto;overflow-x:hidden;padding:0 8px 12px;min-height:0;flex:1}",
  ".dpd-libGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}",
  ".dpd-libItem{border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:8px;background:var(--dsw-alias-bg-base,#fff);padding:8px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;overflow:hidden;transition:border-color .15s,box-shadow .15s}",
  ".dpd-libItem:hover{border-color:var(--dsw-alias-brand-primary,#6366f1);box-shadow:0 2px 8px rgba(0,0,0,.06)}",
  ".dpd-libThumb{position:relative;width:100%;height:32px;display:flex;align-items:center;justify-content:center;overflow:hidden}",
  ".dpd-libName{font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}",
  ".dpd-canvasWrap{position:relative;flex:1;min-width:0;display:flex}",
  ".dpd-canvas{flex:1;min-width:0;overflow:auto;background-color:var(--dsw-alias-bg-layer-2,#f0f1f4);position:relative}",
  ".dpd-previewMode .dpd-canvas{background:#e9ebf0}",
  ".dpd-previewMode .dpd-canvasinner{align-items:center;justify-content:center;padding:24px}",
  ".dpd-previewExit{position:absolute;top:16px;right:16px;z-index:120;border:none;border-radius:999px;padding:7px 13px;background:rgba(17,24,39,.58);color:#fff;font:inherit;font-size:12px;cursor:pointer;opacity:.65;transition:opacity .15s,background .15s}",
  ".dpd-previewExit:hover{opacity:1;background:rgba(17,24,39,.82)}",
  ".dpd-canvasinner{display:flex;align-items:flex-start;justify-content:center;min-width:100%;min-height:100%;width:max-content;box-sizing:border-box;padding:32px}",
  ".dpd-stage{position:relative;flex-shrink:0}",
  ".dpd-world{position:absolute;top:0;left:0}",
  ".dpd-frame{position:absolute;border-radius:18px;box-shadow:0 14px 44px rgba(17,24,39,.20),0 0 0 1px rgba(17,24,39,.06);overflow:hidden}",
  ".dpd-pageLabel{position:absolute;display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;padding:0 2px;overflow:hidden}",
  ".dpd-pageLabel .pin{font-weight:600;color:var(--dsw-alias-label-primary,#111);overflow:hidden;text-overflow:ellipsis;max-width:60%}",
  ".dpd-pageLabel .sz{font-variant-numeric:tabular-nums;opacity:.75}",
  ".dpd-pageLabel.active .pin{color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-el{position:absolute;box-sizing:border-box}",
  ".dpd-el.dpd-container{outline:1px dashed rgba(99,102,241,.30);outline-offset:-1px}",
  ".dpd-el.dpd-group{outline:1px dashed rgba(107,114,128,.28);outline-offset:-1px}",
  ".dpd-canvas.dpd-preview .dpd-container,.dpd-canvas.dpd-preview .dpd-group{outline:none}",
  ".dpd-el.dpd-sel{outline:1.5px solid var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-selBox{position:absolute;pointer-events:none;border:1.5px solid var(--dsw-alias-brand-primary,#6366f1);z-index:40}",
  ".dpd-selBox.multi{border-style:dashed}",
  ".dpd-multiBox{position:absolute;pointer-events:none;border:1px dashed var(--dsw-alias-brand-primary,#6366f1);z-index:39}",
  ".dpd-handle{position:absolute;width:8px;height:8px;background:#fff;border:1.5px solid var(--dsw-alias-brand-primary,#6366f1);border-radius:2px;pointer-events:auto}",
  ".dpd-handle.h-nw{left:-5px;top:-5px}",
  ".dpd-handle.h-n{left:calc(50% - 4px);top:-5px}",
  ".dpd-handle.h-ne{right:-5px;top:-5px}",
  ".dpd-handle.h-e{right:-5px;top:calc(50% - 4px)}",
  ".dpd-handle.h-se{right:-5px;bottom:-5px}",
  ".dpd-handle.h-s{left:calc(50% - 4px);bottom:-5px}",
  ".dpd-handle.h-sw{left:-5px;bottom:-5px}",
  ".dpd-handle.h-w{left:-5px;top:calc(50% - 4px)}",
  ".dpd-guide{position:absolute;background:#ff3d8b;z-index:70;pointer-events:none;box-shadow:0 0 0 .5px rgba(255,61,139,.18)}",
  ".dpd-guide.v{width:1px}",
  ".dpd-guide.h{height:1px}",
  ".dpd-marquee{position:absolute;border:1px solid var(--dsw-alias-brand-primary,#6366f1);background:rgba(99,102,241,.08);z-index:65;pointer-events:none}",
  ".dpd-section{border-top:1px solid var(--dsw-alias-border-l1,#e5e6eb);padding:8px 0 10px}",
  ".dpd-row{display:flex;align-items:center;gap:8px;padding:5px 12px}",
  ".dpd-row>label{width:56px;flex-shrink:0;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280)}",
  ".dpd-input{flex:1;min-width:0;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:6px;padding:4px 7px;color:inherit;font:inherit;font-size:12px}",
  ".dpd-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-color{width:30px;height:24px;padding:0;border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:6px;background:transparent;cursor:pointer}",
  ".dpd-numPair{display:flex;gap:6px;flex:1;min-width:0}",
  ".dpd-numPair .dpd-field{flex:1;display:flex;align-items:center;gap:3px;min-width:0}",
  ".dpd-numPair .dpd-field span{font-size:10.5px;color:var(--dsw-alias-label-secondary,#6b7280)}",
  ".dpd-chips{display:flex;flex-wrap:wrap;gap:5px;padding:2px 12px 6px}",
  ".dpd-alignGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:2px 12px 6px}",
  ".dpd-alignBtn{border:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:6px;padding:5px 4px;font-size:11px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".dpd-alignBtn:hover{border-color:var(--dsw-alias-brand-primary,#6366f1);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-checkRow{display:flex;align-items:center;gap:7px;padding:5px 12px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer}",
  ".dpd-chip{border:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:999px;padding:3px 9px;font-size:11.5px;cursor:pointer;white-space:nowrap}",
  ".dpd-chip:hover{border-color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-chip.active{background:var(--dsw-alias-brand-primary,#6366f1);color:#fff;border-color:transparent}",
  ".dpd-actions{display:flex;gap:6px;padding:4px 12px 10px;flex-wrap:wrap}",
  ".dpd-empty{padding:16px 14px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;line-height:1.6}",
  ".dpd-layers{display:flex;flex-direction:column;gap:1px;padding:0 8px 12px;overflow:auto;flex:1;min-height:0}",
  ".dpd-layer{display:flex;align-items:center;gap:7px;padding:6px 8px;cursor:pointer;font-size:12px;border-radius:6px;color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-layer:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4)}",
  ".dpd-layer.active{background:var(--dsw-alias-bg-layer-2,#f0f1f4);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-layer .dot{width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:.85}",
  ".dpd-layer .caret{width:10px;flex-shrink:0;font-size:10px;color:var(--dsw-alias-label-secondary,#6b7280);opacity:.8}",
  ".dpd-layer .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".dpd-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,.9);z-index:60;text-align:center;padding:24px}",
  ".dpd-overlayTitle{font-size:15px;font-weight:600;color:#161a22}",
  ".dpd-overlayDesc{font-size:12.5px;color:#6b7280;max-width:240px;line-height:1.5}",
  ".dpd-spinner{width:28px;height:28px;border:3px solid rgba(99,102,241,.22);border-top-color:#6366f1;border-radius:50%;animation:dpd-spin .8s linear infinite}",
  "@keyframes dpd-spin{to{transform:rotate(360deg)}}",
  ".dpd-el.dpd-hover{outline:1.5px solid rgba(99,102,241,.5);outline-offset:-1.5px}",
  ".dpd-el.dpd-locked{cursor:default!important}",
  ".dpd-textEditor{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:2px 4px;border:1.5px solid var(--dsw-alias-brand-primary,#6366f1);border-radius:4px;background:rgba(255,255,255,.96);color:#111827;resize:none;outline:none;overflow:hidden;z-index:80;font-family:inherit}",
  ".dpd-breadcrumb{position:absolute;top:8px;left:12px;z-index:90;display:flex;align-items:center;gap:2px;background:rgba(255,255,255,.94);border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:7px;padding:3px 5px;box-shadow:0 2px 8px rgba(17,24,39,.06);max-width:calc(100% - 24px);overflow:hidden}",
  ".dpd-breadcrumb button{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:11.5px;padding:2px 5px;border-radius:4px;cursor:pointer;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}",
  ".dpd-breadcrumb button:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4);color:var(--dsw-alias-label-primary,#111)}",
  ".dpd-breadcrumb button.cur{color:var(--dsw-alias-label-primary,#111);font-weight:600}",
  ".dpd-breadcrumb .sep{color:var(--dsw-alias-label-secondary,#6b7280);opacity:.5;font-size:10px}",
  ".dpd-ctxmenu{position:fixed;z-index:400;min-width:172px;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:9px;box-shadow:0 10px 30px rgba(17,24,39,.16);padding:4px;display:flex;flex-direction:column}",
  ".dpd-ctxmenu button{display:flex;align-items:center;justify-content:space-between;gap:16px;border:none;background:transparent;color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;text-align:left;padding:6px 9px;border-radius:6px;cursor:pointer;white-space:nowrap}",
  ".dpd-ctxmenu button:hover{background:var(--dsw-alias-bg-layer-2,#f0f1f4)}",
  ".dpd-ctxmenu button:disabled{opacity:.4;cursor:default}",
  ".dpd-ctxmenu button.danger{color:#e5484d}",
  ".dpd-ctxmenu button .k{font-size:10.5px;color:var(--dsw-alias-label-secondary,#6b7280)}",
  ".dpd-ctxsep{height:1px;background:var(--dsw-alias-border-l1,#e5e6eb);margin:4px 2px}",
  ".dpd-search{display:flex;align-items:center;gap:6px;padding:0 12px 8px}",
  ".dpd-search input{flex:1;min-width:0;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e6eb);border-radius:6px;padding:4px 8px;font:inherit;font-size:11.5px;color:inherit}",
  ".dpd-search input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-layer .nmInput{flex:1;min-width:0;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-brand-primary,#6366f1);border-radius:4px;padding:1px 4px;font:inherit;font-size:12px;color:inherit}",
  ".dpd-layer .eye,.dpd-layer .lock{width:16px;height:16px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;padding:0;opacity:.55;flex-shrink:0}",
  ".dpd-layer .eye:hover,.dpd-layer .lock:hover{opacity:1}",
  ".dpd-layer .eye.on,.dpd-layer .lock.on{opacity:1;color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-layer.off .nm{opacity:.45;text-decoration:line-through}",
  ".dpd-layer.dragging{opacity:.45}",
  ".dpd-layer.drop-before{box-shadow:inset 0 2px 0 var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-layer.drop-after{box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-layer.drop-inside{background:rgba(99,102,241,.12)}",
  ".dpd-interRow{display:flex;align-items:center;gap:6px;padding:4px 12px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280)}",
  ".dpd-interRow select{flex:1;min-width:0}",
  ".dpd-overlayBackdrop{position:absolute;inset:0;background:rgba(17,24,39,.34);z-index:100;display:flex;align-items:center;justify-content:center}",
  ".dpd-overlayFrame{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(17,24,39,.4)}",
  ".dpd-previewNav{position:absolute;top:16px;left:16px;z-index:120;display:flex;gap:6px}",
  ".dpd-previewNav button{border:none;border-radius:999px;padding:7px 13px;background:rgba(17,24,39,.58);color:#fff;font:inherit;font-size:12px;cursor:pointer;opacity:.65}",
  ".dpd-previewNav button:hover{opacity:1;background:rgba(17,24,39,.82)}"
].join("\n");
function StyleBlock() {
  return h("style", { dangerouslySetInnerHTML: { __html: CSS } });
}

// src/client/overlay.js
function textOr(value, fallback) {
  return value && value.trim() ? value : fallback;
}
function OverlayAction(props) {
  return h(
    "div",
    {
      style: {
        marginTop: 4,
        padding: "7px 14px",
        borderRadius: 8,
        background: "#6366f1",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600
      }
    },
    props.label
  );
}
function PageOverlay(props) {
  const { pageState, content, t } = props;
  const c = content || {};
  if (pageState === "loading") {
    return h(
      "div",
      { className: "dpd-overlay" },
      h("div", { className: "dpd-spinner" }),
      h("div", { className: "dpd-overlayDesc" }, textOr(c.text, t("overlay.loading")))
    );
  }
  if (pageState === "empty") {
    return h(
      "div",
      { className: "dpd-overlay" },
      h(
        Svg,
        { size: 44, strokeWidth: 1.3, style: { color: "#b8bdc9" } },
        h("rect", { x: 2, y: 2, width: 12, height: 12, rx: 2.5 }),
        h("path", { d: "M5 8h6M8 5v6" })
      ),
      h("div", { className: "dpd-overlayTitle" }, textOr(c.title, t("overlay.emptyTitle"))),
      h("div", { className: "dpd-overlayDesc" }, textOr(c.desc, t("overlay.emptyDesc"))),
      h(OverlayAction, { label: textOr(c.action, t("overlay.emptyBtn")) })
    );
  }
  if (pageState === "error") {
    return h(
      "div",
      { className: "dpd-overlay" },
      h(
        Svg,
        { size: 44, strokeWidth: 1.3, style: { color: "#e5484d" } },
        h("circle", { cx: 8, cy: 8, r: 6 }),
        h("path", { d: "M8 5v4M8 11h.01" })
      ),
      h("div", { className: "dpd-overlayTitle" }, textOr(c.title, t("overlay.errorTitle"))),
      h("div", { className: "dpd-overlayDesc" }, textOr(c.desc, t("overlay.errorDesc"))),
      h(OverlayAction, { label: textOr(c.action, t("overlay.errorBtn")) })
    );
  }
  return null;
}

// src/client/ui/canvas.js
var GAP = 72;
var LABEL = 30;
var HANDLES = [
  ["nw", "nwse-resize"],
  ["n", "ns-resize"],
  ["ne", "nesw-resize"],
  ["e", "ew-resize"],
  ["se", "nwse-resize"],
  ["s", "ns-resize"],
  ["sw", "nesw-resize"],
  ["w", "ew-resize"]
];
function textStyle(el) {
  return {
    fontSize: el.props && el.props.fontSize || 14,
    fontWeight: el.props && el.props.fontWeight || 400,
    color: el.props && el.props.color || "#111827",
    textAlign: el.props && el.props.textAlign || "left",
    lineHeight: 1.4
  };
}
function CanvasView(props) {
  const {
    t,
    doc,
    activePage,
    zoom,
    selIds,
    selBoxes,
    multiBounds,
    sel,
    preview,
    pageState,
    ui,
    canvasRef,
    spaceRef,
    spaceDown,
    panning,
    guides,
    marquee,
    hoverId,
    editing,
    breadcrumb,
    overlayPage,
    renderStateFor,
    startDrag,
    startResize,
    startMarquee,
    startPan,
    setSelId,
    setActivePage,
    setUi,
    setUiFor,
    activate,
    setHoverId,
    onContextMenu,
    onInteract,
    onStartTextEdit,
    onTextChange,
    onTextCommit,
    onTextCancel,
    onCloseOverlay
  } = props;
  const selectedSet = new Set(selIds || []);
  function renderElements(elements, pageId, isOverlay) {
    return elements.map((el) => {
      if (el.hidden) return null;
      const st = renderStateFor(el);
      const u = ui[el.id] || {};
      const info = TYPE_INFO[el.type] || TYPE_INFO.text;
      const isEditing = !!(editing && editing.id === el.id && !preview);
      const cursor = spaceDown ? panning ? "grabbing" : "grab" : preview ? info.interactive || el.interactions && el.interactions.length ? "pointer" : "default" : el.locked ? "default" : "move";
      const isBox = isContainerType(el.type);
      const selected = selectedSet.has(el.id) && !preview && !isOverlay;
      const style = {
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        cursor,
        opacity: el.opacity == null ? 1 : el.opacity
      };
      let className = "dpd-el";
      if (selected) className += " dpd-sel";
      if (!preview && !isOverlay && hoverId === el.id && !selected) className += " dpd-hover";
      if (el.locked) className += " dpd-locked";
      if (isBox) {
        className += el.type === "container" ? " dpd-container" : " dpd-group";
        if (el.type === "container") {
          style.background = el.props.background || "#ffffff";
          style.borderRadius = el.props.radius != null ? el.props.radius : 12;
          style.overflow = el.props.clipContent === false ? "visible" : "hidden";
        }
      }
      const handlers = {
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return;
          if (preview || isOverlay) {
            if (preview && el.type === "button") setUiFor(el.id, { press: true });
            return;
          }
          ev.stopPropagation();
          if (el.locked) {
            setSelId(el.id);
            return;
          }
          startDrag(ev, pageId, el);
        },
        onMouseEnter: () => {
          if (preview) {
            if (el.type === "button" || el.type === "card") setUiFor(el.id, { hover: true });
          } else if (!isOverlay) {
            setHoverId(el.id);
          }
        },
        onMouseLeave: () => {
          if (preview) setUiFor(el.id, { hover: false, press: false });
          else if (!isOverlay && hoverId === el.id) setHoverId(null);
        },
        onMouseUp: () => {
          if (preview && el.type === "button") setUiFor(el.id, { press: false });
        },
        onDoubleClick: (ev) => {
          if (preview || isOverlay) return;
          if (!info.hasText) return;
          ev.stopPropagation();
          setSelId(el.id);
          onStartTextEdit(el.id, el.props.text || "");
        },
        onClick: (ev) => {
          if (preview) {
            ev.stopPropagation();
            if (el.interactions && el.interactions.length) onInteract(el);
            else activate(el, ev);
          } else if (!isOverlay) {
            ev.stopPropagation();
            setSelId(el.id);
          }
        },
        onContextMenu: (ev) => {
          if (preview || isOverlay) return;
          ev.preventDefault();
          ev.stopPropagation();
          onContextMenu(ev, el);
        }
      };
      return h(
        "div",
        {
          key: el.id,
          "data-el-id": el.id,
          className,
          style,
          title: el.name || el.props.name || t("comp." + el.type),
          ...handlers
        },
        isEditing ? h("textarea", {
          className: "dpd-textEditor",
          value: editing.value,
          autoFocus: true,
          spellCheck: false,
          style: textStyle(el),
          onMouseDown: (ev) => ev.stopPropagation(),
          onDoubleClick: (ev) => ev.stopPropagation(),
          onChange: (ev) => onTextChange(el.id, ev.target.value),
          onBlur: () => onTextCommit(el.id),
          onKeyDown: (ev) => {
            ev.stopPropagation();
            if (ev.key === "Escape") {
              ev.preventDefault();
              onTextCancel();
            } else if (ev.key === "Enter" && !ev.shiftKey) {
              ev.preventDefault();
              onTextCommit(el.id);
            }
          }
        }) : isBox ? renderElements(el.children || [], pageId, isOverlay) : h(
          "div",
          { style: { width: "100%", height: "100%", pointerEvents: "none" } },
          renderWidget(el, st, t, { tabsActive: u.tabs, preview })
        )
      );
    });
  }
  const visiblePages = preview ? [activePage] : doc.pages;
  const labelOffset = preview ? 0 : LABEL;
  const positions = {};
  let cursorX = 0;
  visiblePages.forEach((p) => {
    positions[p.id] = cursorX;
    cursorX += p.frame.w + GAP;
  });
  const totalW = Math.max(1, cursorX - GAP);
  const maxH = visiblePages.reduce((m, p) => Math.max(m, p.frame.h), 0);
  const worldW = totalW;
  const worldH = labelOffset + maxH;
  const pageLabels = (preview ? [] : doc.pages).map(
    (p) => h(
      "div",
      {
        key: p.id + "#lbl",
        className: "dpd-pageLabel" + (p.id === activePage.id ? " active" : ""),
        style: { left: positions[p.id], top: 4, height: LABEL - 8, cursor: "pointer" },
        onMouseDown: (e) => e.stopPropagation(),
        onClick: () => setActivePage(p.id),
        title: p.name
      },
      h("span", { className: "pin" }, p.name),
      h("span", { className: "sz" }, p.frame.w + "\xD7" + p.frame.h)
    )
  );
  const frameNodes = visiblePages.map((p) => {
    const pageActive = p.id === activePage.id;
    const els = renderElements(p.elements, p.id);
    const selectionNodes = !preview && pageActive ? selBoxes.map((box) => {
      const single = selBoxes.length === 1;
      const node = sel;
      const showHandles = single && node && !node.locked;
      return h(
        "div",
        {
          key: "sel-" + box.id,
          className: "dpd-selBox" + (single ? "" : " multi"),
          style: { left: box.x, top: box.y, width: box.w, height: box.h }
        },
        showHandles ? HANDLES.map(
          ([dir, cur]) => h("div", {
            key: dir,
            className: "dpd-handle h-" + dir,
            "data-dir": dir,
            style: { cursor: cur },
            onMouseDown: (ev) => startResize(ev, node, dir)
          })
        ) : null
      );
    }) : null;
    const multiSelection = !preview && pageActive && multiBounds && selBoxes.length > 1 ? h("div", {
      className: "dpd-multiBox",
      style: {
        left: multiBounds.x,
        top: multiBounds.y,
        width: multiBounds.w,
        height: multiBounds.h
      }
    }) : null;
    const guideNodes = pageActive && !preview && guides && guides.length ? guides.map(
      (g, i) => g.axis === "x" ? h("div", {
        key: "gx-" + i,
        className: "dpd-guide v",
        style: { left: g.pos, top: g.from, height: Math.max(1, g.to - g.from) }
      }) : h("div", {
        key: "gy-" + i,
        className: "dpd-guide h",
        style: { top: g.pos, left: g.from, width: Math.max(1, g.to - g.from) }
      })
    ) : null;
    const marqueeNode = pageActive && marquee && marquee.pageId === p.id ? h("div", {
      className: "dpd-marquee",
      style: {
        left: marquee.x,
        top: marquee.y,
        width: marquee.w,
        height: marquee.h
      }
    }) : null;
    const overlay = pageActive && pageState !== "normal" ? h(PageOverlay, {
      pageState,
      content: p.states && p.states[pageState] || null,
      t
    }) : null;
    return h(
      "div",
      {
        key: p.id,
        className: "dpd-frame",
        style: {
          left: positions[p.id],
          top: labelOffset,
          width: p.frame.w,
          height: p.frame.h,
          background: p.frame.background || "#ffffff"
        },
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return;
          if (preview) {
            setUi({});
            return;
          }
          startMarquee(ev, p);
        },
        onContextMenu: (ev) => {
          if (preview) return;
          ev.preventDefault();
          ev.stopPropagation();
          onContextMenu(ev, null);
        }
      },
      els,
      selectionNodes,
      multiSelection,
      guideNodes,
      marqueeNode,
      overlay
    );
  });
  const gridCell = 20 * zoom;
  const gridMinor = "var(--dsw-alias-border-l1,#e2e5ec)";
  const gridMajor = "var(--dsw-alias-border-l2,#cfd3db)";
  const gridImage = "linear-gradient(to right," + gridMinor + " 1px,transparent 1px),linear-gradient(to bottom," + gridMinor + " 1px,transparent 1px),linear-gradient(to right," + gridMajor + " 1px,transparent 1px),linear-gradient(to bottom," + gridMajor + " 1px,transparent 1px)";
  const gridSize = gridCell + "px " + gridCell + "px," + gridCell + "px " + gridCell + "px," + gridCell * 5 + "px " + gridCell * 5 + "px," + gridCell * 5 + "px " + gridCell * 5 + "px";
  const canvas = h(
    "div",
    {
      className: "dpd-canvas" + (preview ? " dpd-preview" : ""),
      ref: canvasRef,
      title: t("toolbar.panHint"),
      style: { cursor: panning ? "grabbing" : spaceDown ? "grab" : "default" },
      onMouseDown: (ev) => {
        if (ev.button === 1 || spaceRef.current) {
          startPan(ev);
          return;
        }
        if (!preview) setSelId(null);
        else setUi({});
      },
      onContextMenu: (ev) => {
        if (preview) return;
        ev.preventDefault();
        setSelId(null);
        onContextMenu(ev, null);
      }
    },
    h(
      "div",
      {
        className: "dpd-canvasinner",
        style: {
          backgroundImage: preview ? "none" : gridImage,
          backgroundSize: preview ? "auto" : gridSize,
          backgroundPosition: "0 0"
        }
      },
      h(
        "div",
        { className: "dpd-stage", style: { width: worldW * zoom, height: worldH * zoom } },
        h(
          "div",
          {
            className: "dpd-world",
            style: {
              width: worldW,
              height: worldH,
              transform: "scale(" + zoom + ")",
              transformOrigin: "top left"
            }
          },
          pageLabels,
          frameNodes
        )
      )
    ),
    overlayPage ? h(OverlayLayer, {
      page: overlayPage,
      t,
      renderElements,
      onClose: onCloseOverlay
    }) : null
  );
  return h(
    "div",
    { className: "dpd-canvasWrap" },
    !preview && breadcrumb && breadcrumb.length ? h(
      "div",
      { className: "dpd-breadcrumb" },
      breadcrumb.map(
        (item, i) => h(
          "span",
          { key: item.id || i, style: { display: "contents" } },
          i > 0 ? h("span", { className: "sep" }, "\u203A") : null,
          h(
            "button",
            {
              type: "button",
              className: i === breadcrumb.length - 1 ? "cur" : "",
              onClick: () => setSelId(item.id),
              title: item.label
            },
            item.label
          )
        )
      )
    ) : null,
    canvas
  );
}
function OverlayLayer(props) {
  const { page, renderElements, onClose } = props;
  const frame = page.frame || { w: 390, h: 844 };
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const scale = Math.min(1, vh * 0.8 / Math.max(1, frame.h), vw * 0.6 / Math.max(1, frame.w));
  return h(
    "div",
    { className: "dpd-overlayBackdrop", onMouseDown: onClose },
    h(
      "div",
      {
        className: "dpd-overlayFrame",
        style: {
          width: Math.round(frame.w * scale),
          height: Math.round(frame.h * scale),
          background: frame.background || "#ffffff"
        },
        onMouseDown: (ev) => ev.stopPropagation(),
        onClick: (ev) => ev.stopPropagation()
      },
      h(
        "div",
        {
          style: {
            width: frame.w,
            height: frame.h,
            position: "relative",
            transform: "scale(" + scale + ")",
            transformOrigin: "top left"
          }
        },
        renderElements(page.elements || [], page.id, true)
      )
    )
  );
}

// src/client/ui/inspector.js
var PAGE_STATE_KEYS = {
  loading: ["text"],
  empty: ["title", "desc", "action"],
  error: ["title", "desc", "action"]
};
function InspectorView(props) {
  const {
    t,
    doc,
    sel,
    selCount,
    activePage,
    pageState,
    scaleOnResize,
    setScaleOnResize,
    setPreset,
    renameActivePage,
    patchActiveFrame,
    patchPageStates,
    duplicateEl,
    bringFront,
    sendBack,
    deleteEl,
    alignSelection,
    distributeSelection,
    groupSelection,
    ungroupSelection,
    applyAttrs,
    applyProps,
    rightWidth,
    rightCollapsed,
    toggleRight,
    startResizeRight
  } = props;
  if (rightCollapsed) {
    return h(
      "div",
      { className: "dpd-right collapsed" },
      h(
        "button",
        {
          className: "dpd-rightToggle",
          type: "button",
          title: t("inspector.expand"),
          "aria-label": t("inspector.expand"),
          onClick: toggleRight
        },
        "\xAB"
      )
    );
  }
  function numInput(value, onChange) {
    return h("input", {
      className: "dpd-input",
      type: "number",
      value,
      onChange: (e) => {
        const v = parseInt(e.target.value, 10);
        onChange(isNaN(v) ? 0 : v);
      }
    });
  }
  const alignButtons = [
    ["left", "align.left"],
    ["centerX", "align.centerX"],
    ["right", "align.right"],
    ["top", "align.top"],
    ["centerY", "align.centerY"],
    ["bottom", "align.bottom"]
  ].map(
    ([mode, key]) => h(
      "button",
      {
        key: mode,
        type: "button",
        className: "dpd-alignBtn",
        title: t(key),
        onClick: () => alignSelection(mode)
      },
      t(key)
    )
  );
  const colorRow = (value, onChange, label) => h(
    "div",
    { className: "dpd-row" },
    h("label", null, label),
    h("input", {
      className: "dpd-color",
      type: "color",
      value: value || ACCENT,
      onChange: (e) => onChange(e.target.value)
    }),
    h("input", {
      className: "dpd-input",
      type: "text",
      value: value || ACCENT,
      onChange: (e) => onChange(e.target.value)
    })
  );
  let inspectorBody;
  if (selCount > 1) {
    inspectorBody = h(
      "div",
      { key: "multi" },
      h("div", { className: "dpd-empty" }, t("inspector.multi") + " \xB7 " + selCount),
      h("div", { className: "dpd-hint" }, t("inspector.multiHint")),
      colorRow(null, (v) => applyProps({ color: v }, "mcolor"), t("inspector.color")),
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.fontSize")),
        numInput(14, (v) => applyProps({ fontSize: v }, "mfs")),
        h("label", null, t("inspector.radius")),
        numInput(8, (v) => applyProps({ radius: v }, "mradius"))
      ),
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.opacity")),
        h("input", {
          className: "dpd-input",
          type: "number",
          min: 0,
          max: 100,
          step: 5,
          defaultValue: 100,
          onChange: (e) => {
            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            applyAttrs({ opacity: v / 100 }, "mopacity");
          }
        })
      ),
      h(
        "div",
        { className: "dpd-section" },
        h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.align"))),
        h("div", { className: "dpd-alignGrid" }, alignButtons),
        h(
          "div",
          { className: "dpd-actions" },
          h(
            "button",
            { className: "dpd-btn", type: "button", onClick: () => distributeSelection("x") },
            t("align.distributeH")
          ),
          h(
            "button",
            { className: "dpd-btn", type: "button", onClick: () => distributeSelection("y") },
            t("align.distributeV")
          )
        )
      ),
      h(
        "div",
        { className: "dpd-actions" },
        h(
          "button",
          { className: "dpd-btn primary", type: "button", onClick: groupSelection },
          t("inspector.group")
        ),
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: deleteEl },
          h(IconTrash),
          t("inspector.delete")
        )
      )
    );
  } else if (sel) {
    const info = TYPE_INFO[sel.type] || TYPE_INFO.text;
    const stateList = info.states || ["default"];
    const pages = doc && doc.pages || [];
    const interactions = sel.interactions || [];
    inspectorBody = h(
      "div",
      { key: "single" },
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.name")),
        h("input", {
          className: "dpd-input",
          type: "text",
          value: sel.name || "",
          placeholder: sel.props.text || sel.props.name || t("comp." + sel.type),
          onChange: (e) => applyAttrs({ name: e.target.value }, "name:" + sel.id)
        })
      ),
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.position")),
        h(
          "div",
          { className: "dpd-numPair" },
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "X"),
            numInput(sel.x, (v) => applyAttrs({ x: v }, "x:" + sel.id))
          ),
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "Y"),
            numInput(sel.y, (v) => applyAttrs({ y: v }, "y:" + sel.id))
          )
        )
      ),
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.size")),
        h(
          "div",
          { className: "dpd-numPair" },
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "W"),
            numInput(sel.w, (v) => applyAttrs({ w: Math.max(16, v) }, "w:" + sel.id))
          ),
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "H"),
            numInput(sel.h, (v) => applyAttrs({ h: Math.max(12, v) }, "h:" + sel.id))
          )
        )
      ),
      info.hasText ? h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.text")),
        h("input", {
          className: "dpd-input",
          type: "text",
          value: sel.props.text || "",
          placeholder: t("sample.text"),
          onChange: (e) => applyProps({ text: e.target.value }, "text:" + sel.id)
        })
      ) : null,
      info.hasColor || info.hasText ? colorRow(
        sel.props.color,
        (v) => applyProps({ color: v }, "color:" + sel.id),
        t("inspector.color")
      ) : null,
      info.hasFont ? h(
        "div",
        null,
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.fontSize")),
          numInput(
            sel.props.fontSize || 14,
            (v) => applyProps({ fontSize: v }, "fs:" + sel.id)
          )
        ),
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.fontWeight")),
          h(
            "select",
            {
              className: "dpd-select",
              style: { flex: 1 },
              value: String(sel.props.fontWeight || 400),
              onChange: (e) => applyProps({ fontWeight: Number(e.target.value) }, "fw:" + sel.id)
            },
            [400, 500, 600, 700].map(
              (w) => h("option", { key: w, value: String(w) }, String(w))
            )
          )
        ),
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.textAlign")),
          h(
            "select",
            {
              className: "dpd-select",
              style: { flex: 1 },
              value: sel.props.textAlign || "left",
              onChange: (e) => applyProps({ textAlign: e.target.value }, "ta:" + sel.id)
            },
            ["left", "center", "right"].map((v) => h("option", { key: v, value: v }, v))
          )
        )
      ) : null,
      sel.type === "container" || sel.type === "group" ? h(
        "div",
        { className: "dpd-section" },
        h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.container"))),
        sel.type === "container" ? h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.background")),
          h("input", {
            className: "dpd-color",
            type: "color",
            value: sel.props.background || "#ffffff",
            onChange: (e) => applyProps({ background: e.target.value }, "cbg:" + sel.id)
          }),
          h("input", {
            className: "dpd-input",
            type: "text",
            value: sel.props.background || "#ffffff",
            onChange: (e) => applyProps({ background: e.target.value }, "cbg:" + sel.id)
          })
        ) : null,
        sel.type === "container" ? h(
          "label",
          { className: "dpd-checkRow" },
          h("input", {
            type: "checkbox",
            checked: sel.props.clipContent !== false,
            onChange: (e) => applyProps({ clipContent: e.target.checked }, "clip:" + sel.id)
          }),
          t("inspector.clipContent")
        ) : null
      ) : null,
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.radius")),
        numInput(
          sel.props.radius != null ? sel.props.radius : 8,
          (v) => applyProps({ radius: v }, "radius:" + sel.id)
        )
      ),
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.opacity")),
        h("input", {
          className: "dpd-input",
          type: "number",
          min: 0,
          max: 100,
          step: 5,
          value: Math.round((sel.opacity == null ? 1 : sel.opacity) * 100),
          onChange: (e) => {
            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            applyAttrs({ opacity: v / 100 }, "opacity:" + sel.id);
          }
        })
      ),
      h(
        "div",
        { className: "dpd-section" },
        h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.state"))),
        h(
          "div",
          { className: "dpd-chips" },
          stateList.map(
            (s) => h(
              "button",
              {
                key: s,
                type: "button",
                className: "dpd-chip" + ((sel.state || defaultState(sel.type)) === s ? " active" : ""),
                onClick: () => applyAttrs({ state: s })
              },
              t("stateName." + s)
            )
          )
        )
      ),
      h(
        "div",
        { className: "dpd-section" },
        h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.interactions"))),
        interactions.length === 0 ? h("div", { className: "dpd-hint" }, t("inspector.noInteractions")) : interactions.map(
          (item, i) => h(
            "div",
            { className: "dpd-interRow", key: "inter-" + i },
            h(
              "select",
              {
                className: "dpd-select",
                value: item.action,
                onChange: (e) => {
                  const next = interactions.slice();
                  const action = e.target.value;
                  next[i] = {
                    trigger: "click",
                    action,
                    ...action === "back" ? {} : { targetPageId: item.targetPageId || "" }
                  };
                  applyAttrs({ interactions: next });
                }
              },
              ["navigate", "back", "openOverlay"].map(
                (a) => h("option", { key: a, value: a }, t("inspector.action." + a))
              )
            ),
            item.action === "back" ? null : h(
              "select",
              {
                className: "dpd-select",
                value: item.targetPageId || "",
                onChange: (e) => {
                  const next = interactions.slice();
                  next[i] = { ...item, targetPageId: e.target.value };
                  applyAttrs({ interactions: next });
                }
              },
              [h("option", { key: "", value: "" }, "\u2014")].concat(
                pages.map((p) => h("option", { key: p.id, value: p.id }, p.name))
              )
            ),
            h(
              "button",
              {
                className: "dpd-mini",
                type: "button",
                title: t("inspector.removeInteraction"),
                onClick: () => applyAttrs({ interactions: interactions.filter((_, j) => j !== i) })
              },
              "\xD7"
            )
          )
        ),
        h(
          "div",
          { className: "dpd-actions" },
          h(
            "button",
            {
              className: "dpd-btn",
              type: "button",
              onClick: () => {
                const target = pages.find((p) => p.id !== activePage.id) || activePage;
                applyAttrs({
                  interactions: [
                    ...interactions,
                    { trigger: "click", action: "navigate", targetPageId: target.id }
                  ]
                });
              }
            },
            t("inspector.addInteraction")
          )
        )
      ),
      h(
        "div",
        { className: "dpd-actions" },
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: duplicateEl },
          h(IconCopy),
          t("inspector.duplicate")
        ),
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: bringFront },
          h(IconFront),
          t("inspector.front")
        ),
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: sendBack },
          h(IconBack),
          t("inspector.back")
        ),
        sel.type === "group" ? h(
          "button",
          { className: "dpd-btn", type: "button", onClick: ungroupSelection },
          t("inspector.ungroup")
        ) : null,
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: deleteEl },
          h(IconTrash),
          t("inspector.delete")
        )
      )
    );
  } else {
    const states = activePage && activePage.states || {};
    const stateKeys = PAGE_STATE_KEYS[pageState] || null;
    const stateValue = stateKeys ? states[pageState] || {} : null;
    inspectorBody = h(
      "div",
      { key: "page" },
      h("div", { className: "dpd-empty" }, t("inspector.empty")),
      h(
        "div",
        { className: "dpd-section" },
        h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.frame"))),
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.pageName")),
          h("input", {
            className: "dpd-input",
            type: "text",
            value: activePage ? activePage.name : "",
            onChange: (e) => renameActivePage(e.target.value)
          })
        ),
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("frame.title")),
          h(
            "select",
            {
              className: "dpd-select",
              style: { flex: 1 },
              value: activePage && activePage.frame.preset || "mobile",
              onChange: (e) => setPreset(e.target.value)
            },
            ["mobile", "tablet", "desktop"].map(
              (k) => h("option", { key: k, value: k }, t("frame." + k))
            )
          )
        ),
        h(
          "div",
          { className: "dpd-row" },
          h("label", null, t("inspector.background")),
          h("input", {
            className: "dpd-color",
            type: "color",
            value: activePage && activePage.frame.background || "#ffffff",
            onChange: (e) => patchActiveFrame({ background: e.target.value })
          }),
          h("input", {
            className: "dpd-input",
            type: "text",
            value: activePage && activePage.frame.background || "#ffffff",
            onChange: (e) => patchActiveFrame({ background: e.target.value })
          })
        ),
        h(
          "label",
          { className: "dpd-checkRow" },
          h("input", {
            type: "checkbox",
            checked: scaleOnResize !== false,
            onChange: (e) => setScaleOnResize(e.target.checked)
          }),
          t("inspector.scaleOnResize")
        )
      ),
      stateKeys ? h(
        "div",
        { className: "dpd-section" },
        h(
          "div",
          { className: "dpd-panelTitle" },
          h("span", null, t("inspector.states")),
          h("span", null, t("state." + pageState))
        ),
        stateKeys.map(
          (field) => h(
            "div",
            { className: "dpd-row", key: field },
            h("label", null, t("inspector.state" + field[0].toUpperCase() + field.slice(1))),
            h("input", {
              className: "dpd-input",
              type: "text",
              value: stateValue && stateValue[field] || "",
              placeholder: t(
                pageState === "loading" ? "overlay.loading" : pageState === "empty" ? field === "title" ? "overlay.emptyTitle" : field === "desc" ? "overlay.emptyDesc" : "overlay.emptyBtn" : field === "title" ? "overlay.errorTitle" : field === "desc" ? "overlay.errorDesc" : "overlay.errorBtn"
              ),
              onChange: (e) => patchPageStates(pageState, { [field]: e.target.value })
            })
          )
        )
      ) : null
    );
  }
  const right = h(
    "div",
    { className: "dpd-right", style: { width: rightWidth || 242 } },
    h("div", { className: "dpd-resizer left", onMouseDown: startResizeRight }),
    h(
      "div",
      { className: "dpd-panelTitle" },
      h("span", null, t("inspector.title")),
      h(
        "button",
        {
          className: "dpd-mini",
          type: "button",
          title: t("inspector.collapse"),
          "aria-label": t("inspector.collapse"),
          onClick: toggleRight
        },
        "\xBB"
      )
    ),
    inspectorBody
  );
  return right;
}

// src/client/ui/left.js
function LockGlyph(props) {
  const locked = props.locked;
  return h(
    "svg",
    {
      width: 13,
      height: 13,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.3,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true
    },
    h("rect", { x: 3.5, y: 7, width: 9, height: 6.5, rx: 1.6 }),
    locked ? h("path", { d: "M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7" }) : h("path", { d: "M5.5 7V5.4a2.5 2.5 0 0 1 4.7-1.2" })
  );
}
function layerLabel(el, t) {
  return el.name || el.props.text || el.props.name || t("comp." + el.type);
}
function LeftView(props) {
  const {
    t,
    doc,
    activePage,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    addElement,
    section,
    setSection,
    leftWidth,
    startResizeLeft,
    selIds,
    setSelId,
    setPreview,
    setEl,
    onLayerMove,
    layerQuery,
    setLayerQuery
  } = props;
  const [dragId, setDragId] = useState2(null);
  const [dropTarget, setDropTarget] = useState2(null);
  const [renaming, setRenaming] = useState2(null);
  const [renameValue, setRenameValue] = useState2("");
  const pageRows = doc.pages.map(
    (p) => h(
      "div",
      {
        key: p.id,
        className: "dpd-pageRow" + (p.id === activePage.id ? " active" : ""),
        onClick: () => setActivePage(p.id)
      },
      h("span", { className: "nm" }, p.name),
      h("span", { className: "sz" }, p.frame.w + "\xD7" + p.frame.h),
      h(
        "button",
        {
          className: "dpd-mini",
          type: "button",
          title: t("pages.duplicate"),
          onClick: (e) => {
            e.stopPropagation();
            duplicatePage(p.id);
          }
        },
        h(IconCopy)
      ),
      h(
        "button",
        {
          className: "dpd-mini",
          type: "button",
          title: t("pages.delete"),
          onClick: (e) => {
            e.stopPropagation();
            deletePage(p.id);
          }
        },
        h(IconTrash)
      )
    )
  );
  const activeElements = activePage && activePage.elements || [];
  const query = (layerQuery || "").trim().toLowerCase();
  const layerRows = [];
  const collectRows = (elements, depth) => {
    elements.slice().reverse().forEach((el) => {
      const label = layerLabel(el, t);
      const matches = !query || label.toLowerCase().includes(query);
      if (matches) layerRows.push({ el, depth, label });
      if (isContainerType(el.type) && Array.isArray(el.children)) {
        collectRows(el.children, depth + 1);
      }
    });
  };
  collectRows(activeElements, 0);
  const selectedSet = new Set(selIds || []);
  const railBtn = (id, icon, label) => h(
    "button",
    {
      type: "button",
      className: "dpd-railbtn" + (section === id ? " active" : ""),
      title: label,
      "aria-label": label,
      onClick: () => setSection((cur) => cur === id ? null : id)
    },
    h(icon)
  );
  const pagesBody = h(
    "div",
    { className: "dpd-sectionBody" },
    h(
      "div",
      { className: "dpd-panelTitle" },
      h("span", null, t("pages.title")),
      h(
        "button",
        { className: "dpd-mini", type: "button", title: t("pages.add"), onClick: addPage },
        h(IconPlus)
      )
    ),
    h("div", { className: "dpd-pages" }, pageRows)
  );
  const componentsBody = h(
    "div",
    { className: "dpd-sectionBody" },
    h("div", { className: "dpd-panelTitle" }, h("span", null, t("library.title"))),
    h("div", { className: "dpd-hint" }, t("library.hint")),
    h(
      "div",
      { className: "dpd-libScroll" },
      h(
        "div",
        { className: "dpd-libGrid" },
        LIB_ORDER.map((type) => {
          const sample = {
            id: "lib-" + type,
            type,
            x: 0,
            y: 0,
            w: 120,
            h: 32,
            state: defaultState(type),
            props: {}
          };
          return h(
            "button",
            {
              key: type,
              type: "button",
              className: "dpd-libItem",
              onClick: () => addElement(type),
              title: t("comp." + type)
            },
            h(
              "div",
              { className: "dpd-libThumb" },
              h(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 96,
                    height: 30,
                    transform: "translate(-50%,-50%) scale(.62)",
                    transformOrigin: "center",
                    pointerEvents: "none"
                  }
                },
                renderWidget(sample, defaultState(type), t, {})
              )
            ),
            h("span", { className: "dpd-libName" }, t("comp." + type))
          );
        })
      )
    )
  );
  const commitRename = (el) => {
    const value = renameValue.trim();
    setRenaming(null);
    if (value && value !== layerLabel(el, t)) setEl(el.id, { name: value });
  };
  const layersBody = h(
    "div",
    { className: "dpd-sectionBody" },
    h(
      "div",
      { className: "dpd-panelTitle" },
      h("span", null, t("layers.title")),
      h(
        "span",
        {
          style: {
            textTransform: "none",
            letterSpacing: 0,
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        },
        activePage ? activePage.name : ""
      )
    ),
    h(
      "div",
      { className: "dpd-search" },
      h("input", {
        type: "search",
        value: layerQuery || "",
        placeholder: t("layers.search"),
        onChange: (e) => setLayerQuery(e.target.value)
      })
    ),
    h(
      "div",
      { className: "dpd-layers" },
      layerRows.length === 0 ? h("div", { className: "dpd-empty" }, t("layers.empty")) : layerRows.map(({ el, depth, label }) => {
        const isDrop = dropTarget && dropTarget.id === el.id;
        let cls = "dpd-layer";
        if (selectedSet.has(el.id)) cls += " active";
        if (el.hidden) cls += " off";
        if (dragId === el.id) cls += " dragging";
        if (isDrop) cls += " drop-" + dropTarget.position;
        return h(
          "div",
          {
            key: el.id,
            className: cls,
            draggable: true,
            style: { paddingLeft: 8 + depth * 16 },
            onClick: () => {
              setSelId(el.id);
              setPreview(false);
              setActivePage(activePage.id);
            },
            onDragStart: (e) => {
              setDragId(el.id);
              try {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", el.id);
              } catch (err) {
              }
            },
            onDragEnd: () => {
              setDragId(null);
              setDropTarget(null);
            },
            onDragOver: (e) => {
              if (!dragId || dragId === el.id) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientY - rect.top) / Math.max(1, rect.height);
              const position = isContainerType(el.type) && ratio > 0.25 && ratio < 0.75 ? "inside" : ratio < 0.5 ? "before" : "after";
              setDropTarget({ id: el.id, position });
            },
            onDragLeave: () => {
              setDropTarget((cur) => cur && cur.id === el.id ? null : cur);
            },
            onDrop: (e) => {
              e.preventDefault();
              const source = dragId || e.dataTransfer.getData("text/plain");
              const position = dropTarget && dropTarget.id === el.id ? dropTarget.position : "after";
              setDragId(null);
              setDropTarget(null);
              if (source && source !== el.id) onLayerMove(source, el.id, position);
            }
          },
          isContainerType(el.type) ? h("span", { className: "caret" }, "\u25BE") : null,
          h("span", { className: "dot" }, h(Svg, { size: 13 }, libGlyph(el.type))),
          renaming === el.id ? h("input", {
            className: "nmInput",
            value: renameValue,
            autoFocus: true,
            onClick: (e) => e.stopPropagation(),
            onChange: (e) => setRenameValue(e.target.value),
            onBlur: () => commitRename(el),
            onKeyDown: (e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename(el);
              else if (e.key === "Escape") setRenaming(null);
            }
          }) : h(
            "span",
            {
              className: "nm",
              title: t("layers.rename"),
              onDoubleClick: (e) => {
                e.stopPropagation();
                setRenaming(el.id);
                setRenameValue(label);
              }
            },
            label
          ),
          h(
            "button",
            {
              className: "eye" + (el.hidden ? " on" : ""),
              type: "button",
              title: el.hidden ? t("layers.show") : t("layers.hide"),
              "aria-label": el.hidden ? t("layers.show") : t("layers.hide"),
              onClick: (e) => {
                e.stopPropagation();
                setEl(el.id, { hidden: !el.hidden });
              }
            },
            h(IconEye, { size: 13 })
          ),
          h(
            "button",
            {
              className: "lock" + (el.locked ? " on" : ""),
              type: "button",
              title: el.locked ? t("layers.unlock") : t("layers.lock"),
              "aria-label": el.locked ? t("layers.unlock") : t("layers.lock"),
              onClick: (e) => {
                e.stopPropagation();
                setEl(el.id, { locked: !el.locked });
              }
            },
            h(LockGlyph, { locked: el.locked })
          )
        );
      })
    )
  );
  const sectionContent = section === "pages" ? pagesBody : section === "components" ? componentsBody : section === "layers" ? layersBody : null;
  const left = h(
    "div",
    { className: "dpd-leftcol" },
    h(
      "div",
      { className: "dpd-rail" },
      railBtn("pages", IconPages, t("pages.title")),
      railBtn("components", IconComponents, t("library.title")),
      railBtn("layers", IconLayers, t("layers.title"))
    ),
    sectionContent ? h(
      "div",
      { className: "dpd-sectionwrap", style: { width: leftWidth } },
      sectionContent,
      h("div", { className: "dpd-resizer", onMouseDown: startResizeLeft })
    ) : null
  );
  return left;
}

// src/client/ui/toolbar.js
var stateLabels = {
  normal: "state.normal",
  loading: "state.loading",
  empty: "state.empty",
  error: "state.error"
};
function ToolbarView(props) {
  const {
    t,
    doc,
    setDoc,
    activePage,
    setPreset,
    pageState,
    setPageState,
    zoom,
    setZoom,
    preview,
    togglePreview,
    undo,
    redo,
    canUndo,
    canRedo,
    setSelId,
    snapEnabled,
    toggleSnap
  } = props;
  const toolbar = h(
    "div",
    { className: "dpd-toolbar" },
    h(
      "span",
      { className: "dpd-brand" },
      h(
        "svg",
        {
          width: 18,
          height: 18,
          viewBox: "0 0 16 16",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true
        },
        h("rect", { x: 1.5, y: 2, width: 13, height: 11.5, rx: 2 }),
        h("path", { d: "M1.5 5.4h13" }),
        h("rect", { x: 3.6, y: 8, width: 4, height: 3.2, rx: 0.6 }),
        h("circle", { cx: 10.6, cy: 9.6, r: 1.4 })
      ),
      t("app.title")
    ),
    h("input", {
      className: "dpd-nameInput",
      value: doc.name,
      placeholder: t("name.placeholder"),
      onChange: (e) => setDoc((d) => ({ ...d, name: e.target.value }), "docname")
    }),
    h("div", { className: "dpd-spacer" }),
    h(
      "select",
      {
        className: "dpd-select",
        value: activePage && activePage.frame.preset || "mobile",
        title: t("frame.title"),
        onChange: (e) => setPreset(e.target.value)
      },
      ["mobile", "tablet", "desktop"].map(
        (k) => h("option", { key: k, value: k }, t("frame." + k))
      )
    ),
    h(
      "div",
      { className: "dpd-seg", title: t("frame.title") },
      ["normal", "loading", "empty", "error"].map(
        (s) => h(
          "button",
          {
            key: s,
            type: "button",
            className: pageState === s ? "active" : "",
            onClick: () => setPageState(s)
          },
          t(stateLabels[s])
        )
      )
    ),
    h(
      "button",
      {
        className: "dpd-iconbtn",
        type: "button",
        title: t("toolbar.undo"),
        disabled: !canUndo,
        style: { opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" },
        onClick: undo
      },
      h(IconUndo)
    ),
    h(
      "button",
      {
        className: "dpd-iconbtn",
        type: "button",
        title: t("toolbar.redo"),
        disabled: !canRedo,
        style: { opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" },
        onClick: redo
      },
      h(IconRedo)
    ),
    h(
      "button",
      {
        className: "dpd-btn" + (snapEnabled ? " primary" : ""),
        type: "button",
        title: t("toolbar.snap"),
        "aria-pressed": !!snapEnabled,
        onClick: toggleSnap
      },
      h(IconMagnet),
      t("toolbar.snap")
    ),
    h(
      "button",
      {
        className: "dpd-iconbtn",
        type: "button",
        title: "\u7F29\u5C0F",
        onClick: () => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))
      },
      h(IconMinus)
    ),
    h(
      "button",
      { className: "dpd-zoom", type: "button", title: "\u7F29\u653E\u81F3 100%", onClick: () => setZoom(1) },
      Math.round(zoom * 100) + "%"
    ),
    h(
      "button",
      {
        className: "dpd-iconbtn",
        type: "button",
        title: "\u653E\u5927",
        onClick: () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))
      },
      h(IconPlus)
    ),
    h(
      "button",
      {
        className: "dpd-btn" + (preview ? " primary" : ""),
        type: "button",
        onClick: () => {
          togglePreview();
          setSelId(null);
        }
      },
      h(preview ? IconPencil : IconEye),
      preview ? t("toolbar.edit") : t("toolbar.preview")
    ),
    h("span", { className: "dpd-saved" }, t("toolbar.saved"))
  );
  return toolbar;
}

// src/client/panel.js
function mapTree(elements, fn) {
  let changed = false;
  const out = elements.map((el) => {
    let next = fn(el);
    if (isContainerType(next.type) && Array.isArray(next.children)) {
      const kids = mapTree(next.children, fn);
      if (kids !== next.children) next = { ...next, children: kids };
    }
    if (next !== el) changed = true;
    return next;
  });
  return changed ? out : elements;
}
function removeFromTree(elements, idSet) {
  let changed = false;
  const out = [];
  for (const el of elements) {
    if (idSet.has(el.id)) {
      changed = true;
      continue;
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = removeFromTree(el.children, idSet);
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
function extractFromTree2(elements, id) {
  let extracted = null;
  let changed = false;
  const walk = (list) => {
    const out = [];
    for (const el of list) {
      if (el.id === id) {
        extracted = el;
        changed = true;
        continue;
      }
      if (isContainerType(el.type) && Array.isArray(el.children)) {
        const kids = walk(el.children);
        if (kids !== el.children) {
          out.push({ ...el, children: kids });
          continue;
        }
      }
      out.push(el);
    }
    return out;
  };
  const next = walk(elements);
  return { elements: changed ? next : elements, extracted };
}
function appendToContainer(elements, containerId, el) {
  let changed = false;
  const out = elements.map((cur) => {
    if (cur.id === containerId) {
      changed = true;
      return { ...cur, children: [...cur.children || [], el] };
    }
    if (isContainerType(cur.type) && Array.isArray(cur.children)) {
      const kids = appendToContainer(cur.children, containerId, el);
      if (kids !== cur.children) {
        changed = true;
        return { ...cur, children: kids };
      }
    }
    return cur;
  });
  return changed ? out : elements;
}
function replaceInTree(elements, id, updater) {
  let changed = false;
  const out = elements.map((el) => {
    if (el.id === id) {
      changed = true;
      return updater(el);
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = replaceInTree(el.children, id, updater);
      if (kids !== el.children) {
        changed = true;
        return { ...el, children: kids };
      }
    }
    return el;
  });
  return changed ? out : elements;
}
function duplicateInTree(elements, idSet, rootIds) {
  const out = [];
  for (const el of elements) {
    if (idSet.has(el.id)) {
      const copy = cloneElementDeep(el, () => uid());
      copy.x += 16;
      copy.y += 16;
      rootIds.push(copy.id);
      out.push(el, copy);
      continue;
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = duplicateInTree(el.children, idSet, rootIds);
      out.push(kids !== el.children ? { ...el, children: kids } : el);
      continue;
    }
    out.push(el);
  }
  return out;
}
function sameDoc(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
}
function ProductDesignPanel() {
  const t = useT();
  const sessionId = useSessionId();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const [doc, setDocState] = useState2(() => loadDoc(sessionId) || defaultDoc(t));
  const docRef = useRef(doc);
  const histRef = useRef({ past: [], future: [] });
  const lastKeyRef = useRef({ key: null, time: 0 });
  const [, bumpHist] = useState2(0);
  const HIST_LIMIT = 120;
  const setDoc = useCallback2((updater, mode) => {
    const prev = docRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (next === prev) return;
    if (mode !== false) {
      const h2 = histRef.current;
      let record = true;
      if (typeof mode === "string") {
        const now = Date.now();
        if (lastKeyRef.current.key === mode && now - lastKeyRef.current.time < 900) record = false;
        lastKeyRef.current = { key: mode, time: now };
      } else {
        lastKeyRef.current = { key: null, time: 0 };
      }
      if (record) {
        pushPastSnapshot(prev);
        lastEditRef.current = Date.now();
      }
      h2.future = [];
    }
    docRef.current = next;
    setDocState(next);
  }, []);
  const [selIds, setSelIds] = useState2([]);
  const [hoverId, setHoverId] = useState2(null);
  const [editing, setEditing] = useState2(null);
  const editingRef = useRef(null);
  editingRef.current = editing;
  const [ctxMenu, setCtxMenu] = useState2(null);
  const [layerQuery, setLayerQuery] = useState2("");
  const [previewStack, setPreviewStack] = useState2([]);
  const [previewOverlay, setPreviewOverlay] = useState2(null);
  const clipboardRef = useRef([]);
  const lastEditRef = useRef(0);
  const [preview, setPreview] = useState2(false);
  const [pageState, setPageState] = useState2("normal");
  const [zoom, setZoom] = useState2(1);
  const [ui, setUi] = useState2({});
  const [spaceDown, setSpaceDown] = useState2(false);
  const spaceRef = useRef(false);
  const [panning, setPanning] = useState2(false);
  const [guides, setGuides] = useState2([]);
  const [marquee, setMarquee] = useState2(null);
  const [snapEnabled, setSnapEnabled] = useState2(() => loadUi().snapEnabled !== false);
  const [scaleOnResize, setScaleOnResize] = useState2(() => loadUi().scaleOnResize !== false);
  const snapRef = useRef(snapEnabled);
  snapRef.current = snapEnabled;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [leftWidth, setLeftWidth] = useState2(() => {
    const w = Number(loadUi().leftWidth);
    return w >= 168 && w <= 460 ? w : 264;
  });
  const [rightWidth, setRightWidth] = useState2(() => {
    const w = Number(loadUi().rightWidth);
    return w >= 200 && w <= 520 ? w : 242;
  });
  const [rightCollapsed, setRightCollapsed] = useState2(() => loadUi().rightCollapsed === true);
  const [section, setSection] = useState2(() => {
    const s = loadUi().section;
    return s === null || s === "pages" || s === "components" || s === "layers" ? s : "pages";
  });
  const hostRef = useRef({ on: false, revision: 0, suppressSave: false });
  useEffect2(() => {
    const sid = sessionIdRef.current;
    saveDoc(doc, sid);
    if (hostRef.current.suppressSave) {
      hostRef.current.suppressSave = false;
      return void 0;
    }
    if (!hostRef.current.on) return void 0;
    const timer = setTimeout(() => {
      apiFetch(
        "/doc",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            baseRevision: hostRef.current.revision,
            doc,
            sessionId: sid
          })
        },
        sid
      ).then((res) => {
        if (!res) return;
        if (res.status === 200 && res.body) {
          hostRef.current.revision = res.body.revision;
        } else if (res.status === 409 && res.body && res.body.doc) {
          const nd = normalizeDoc(res.body.doc);
          if (nd) {
            hostRef.current.revision = res.body.revision;
            adoptRemoteDoc(nd);
          }
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);
  useEffect2(() => {
    let cancelled = false;
    let source = null;
    const sid = sessionId;
    const localDoc = loadDoc(sid) || defaultDoc(t);
    hostRef.current = { on: false, revision: 0, suppressSave: true };
    docRef.current = localDoc;
    setDocState(localDoc);
    setSelIds([]);
    setPreview(false);
    setPreviewStack([]);
    setPreviewOverlay(null);
    setEditing(null);
    histRef.current = { past: [], future: [] };
    (async () => {
      const canStream = typeof window.EventSource === "function";
      const attempts = canStream ? 6 : 1;
      let got = null;
      for (let i = 0; i < attempts && !cancelled; i += 1) {
        got = await apiFetch("/doc", void 0, sid);
        if (got && got.status === 200 && got.body) break;
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
      }
      if (cancelled || !got || got.status !== 200 || !got.body) return;
      hostRef.current.on = true;
      hostRef.current.revision = got.body.revision || 0;
      if (got.body.doc) {
        const nd = normalizeDoc(got.body.doc);
        if (nd) {
          hostRef.current.suppressSave = true;
          docRef.current = nd;
          setDocState(nd);
        }
      } else {
        const seeded = await apiFetch(
          "/doc",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              baseRevision: hostRef.current.revision,
              doc: docRef.current,
              sessionId: sid
            })
          },
          sid
        );
        if (seeded && seeded.status === 200 && seeded.body)
          hostRef.current.revision = seeded.body.revision;
      }
      if (cancelled || typeof window.EventSource !== "function") return;
      try {
        const eventsUrl = new URL(API_PREFIX + "/events", window.location.href);
        if (sid) eventsUrl.searchParams.set("sessionId", sid);
        source = new window.EventSource(eventsUrl.toString());
        source.onmessage = (evt) => {
          let data = null;
          try {
            data = JSON.parse(evt.data);
          } catch (e) {
            data = null;
          }
          if (!data || typeof data.revision !== "number" || data.revision === hostRef.current.revision)
            return;
          apiFetch("/doc", void 0, sid).then((snap) => {
            if (!snap || snap.status !== 200 || !snap.body || !snap.body.doc) return;
            const nd = normalizeDoc(snap.body.doc);
            if (!nd) return;
            hostRef.current.revision = snap.body.revision;
            adoptRemoteDoc(nd);
          });
        };
      } catch (e) {
      }
    })();
    return () => {
      cancelled = true;
      if (source) {
        try {
          source.close();
        } catch (e) {
        }
      }
    };
  }, [sessionId]);
  useEffect2(() => {
    saveUi({
      leftWidth,
      rightWidth,
      rightCollapsed,
      section,
      snapEnabled,
      scaleOnResize
    });
  }, [leftWidth, rightWidth, rightCollapsed, section, snapEnabled, scaleOnResize]);
  const canvasRef = useRef(null);
  useEffect2(() => {
    const el = canvasRef.current;
    if (!el) return void 0;
    const onWheel = (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      const dir = ev.deltaY > 0 ? -1 : 1;
      setZoom((z) => Math.max(0.2, Math.min(2, Math.round((z + dir * 0.1) * 10) / 10)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  useEffect2(() => {
    const isEditable = (tgt) => {
      const tag = tgt && tgt.tagName || "";
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || tgt && tgt.isContentEditable;
    };
    const down = (e) => {
      if (e.code !== "Space" || isEditable(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpaceDown(true);
      }
    };
    const up = (e) => {
      if (e.code === "Space") {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    const blur = () => {
      spaceRef.current = false;
      setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const keyHandlerRef = useRef(null);
  keyHandlerRef.current = (e) => {
    const tgt = e.target;
    const tag = tgt && tgt.tagName || "";
    const editable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tgt && tgt.isContentEditable;
    if (editable) {
      if (e.key === "Escape") tgt.blur();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (mod && !e.shiftKey && (k === "z" || k === "Z")) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && e.shiftKey && (k === "z" || k === "Z")) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && (k === "y" || k === "Y")) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && !e.shiftKey && (k === "g" || k === "G")) {
      e.preventDefault();
      groupSelection();
      return;
    }
    if (mod && e.shiftKey && (k === "g" || k === "G")) {
      e.preventDefault();
      ungroupSelection();
      return;
    }
    if (mod && (k === "d" || k === "D")) {
      e.preventDefault();
      duplicateEl();
      return;
    }
    if (mod && !e.shiftKey && (k === "c" || k === "C")) {
      e.preventDefault();
      copySelection();
      return;
    }
    if (mod && !e.shiftKey && (k === "x" || k === "X")) {
      e.preventDefault();
      cutSelection();
      return;
    }
    if (mod && !e.shiftKey && (k === "v" || k === "V")) {
      e.preventDefault();
      pasteClipboard();
      return;
    }
    if (mod && (k === "]" || k === "}")) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? "front" : "forward");
      return;
    }
    if (mod && (k === "[" || k === "{")) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? "back" : "backward");
      return;
    }
    if (k === "Escape") {
      if (editingRef.current) {
        setEditing(null);
        return;
      }
      if (ctxMenu) {
        setCtxMenu(null);
        return;
      }
      if (preview) {
        if (previewOverlay) setPreviewOverlay(null);
        else if (previewStack.length > 1) setPreviewStack((stack) => stack.slice(0, -1));
        else setPreview(false);
      } else {
        setSelIds([]);
      }
      return;
    }
    if (preview) return;
    if (!selIds.length) return;
    if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      deleteEl();
      return;
    }
    if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0;
      const dy = k === "ArrowUp" ? -step : k === "ArrowDown" ? step : 0;
      nudgeSelected(dx, dy);
    }
  };
  useEffect2(() => {
    const fn = (e) => keyHandlerRef.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect2(() => {
    if (!ctxMenu) return void 0;
    const close = () => setCtxMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [ctxMenu]);
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  const treeEntries = activePage ? collectElementEntries(activePage.elements) : [];
  const entryById = new Map(treeEntries.map((entry) => [entry.el.id, entry]));
  const selEntries = selIds.map((id) => entryById.get(id)).filter(Boolean);
  const sel = selEntries.length === 1 ? selEntries[0].el : null;
  const selBoxes = selEntries.map((entry) => ({
    id: entry.el.id,
    x: entry.absX,
    y: entry.absY,
    w: entry.w,
    h: entry.h
  }));
  const multiBounds = selEntries.length > 1 ? boundsOfEntries(selEntries) : null;
  const setActivePage = useCallback2(
    (id) => {
      setEditing(null);
      setHoverId(null);
      setSelIds((ids) => {
        const page = docRef.current.pages.find((p) => p.id === id);
        if (!page) return [];
        const kept = ids.filter((item) => !!findElementEntry(page.elements, item));
        return kept.length === ids.length ? ids : kept;
      });
      setDoc((d) => d.activePageId === id ? d : { ...d, activePageId: id });
    },
    [setDoc]
  );
  const setUiFor = useCallback2((id, patch) => {
    setUi((u) => ({ ...u, [id]: { ...u[id] || {}, ...patch } }));
  }, []);
  const mapEl = useCallback2(
    (elId, fn, mode) => {
      setDoc(
        (d) => ({
          ...d,
          pages: d.pages.map((p) => ({
            ...p,
            elements: replaceInTree(p.elements, elId, fn)
          }))
        }),
        mode
      );
    },
    [setDoc]
  );
  const setEl = useCallback2(
    (elId, patch, mode) => mapEl(elId, (e) => ({ ...e, ...patch }), mode),
    [mapEl]
  );
  const setElProps = useCallback2(
    (elId, patch, mode) => mapEl(elId, (e) => ({ ...e, props: { ...e.props, ...patch } }), mode),
    [mapEl]
  );
  function undo() {
    const h2 = histRef.current;
    if (!h2.past.length) return;
    const prev = h2.past.pop();
    h2.future.push(docRef.current);
    docRef.current = prev;
    setDocState(prev);
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
  }
  function redo() {
    const h2 = histRef.current;
    if (!h2.future.length) return;
    const next = h2.future.pop();
    h2.past.push(docRef.current);
    if (h2.past.length > HIST_LIMIT) h2.past.shift();
    docRef.current = next;
    setDocState(next);
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
  }
  function nudgeSelected(dx, dy) {
    if (!selIds.length) return;
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: mapTree(
            p.elements,
            (e) => ids.has(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e
          )
        }))
      }),
      "nudge:" + selIds.join(",")
    );
  }
  function pushPastSnapshot(snapshot) {
    const h2 = histRef.current;
    h2.past.push(snapshot);
    if (h2.past.length > HIST_LIMIT) h2.past.shift();
    h2.future = [];
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
  }
  function adoptRemoteDoc(nd) {
    const prev = docRef.current;
    if (prev && sameDoc(prev, nd)) return;
    if (prev && Date.now() - lastEditRef.current > 800) pushPastSnapshot(prev);
    hostRef.current.suppressSave = true;
    docRef.current = nd;
    setDocState(nd);
    setEditing(null);
    setSelIds(
      (ids) => ids.filter((id) => nd.pages.some((p) => !!findElementEntry(p.elements, id)))
    );
  }
  function mapSelection(fn, mode) {
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: mapTree(p.elements, (el) => ids.has(el.id) ? fn(el) : el)
        }))
      }),
      mode
    );
  }
  function applyAttrs(patch, mode) {
    mapSelection((el) => ({ ...el, ...patch }), mode);
  }
  function applyProps(patch, mode) {
    mapSelection((el) => ({ ...el, props: { ...el.props, ...patch } }), mode);
  }
  function patchPageStates(key, patch) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map(
          (p) => p.id === d.activePageId ? {
            ...p,
            states: {
              ...p.states || {},
              [key]: { ...(p.states || {})[key] || {}, ...patch }
            }
          } : p
        )
      }),
      "pstate:" + key
    );
  }
  function copySelection() {
    const entries = topSelectedEntries();
    if (!entries.length) return;
    clipboardRef.current = entries.map((entry) => ({
      el: cloneElementDeep(entry.el),
      absX: entry.absX,
      absY: entry.absY
    }));
  }
  function cutSelection() {
    copySelection();
    deleteEl();
  }
  function pasteClipboard() {
    const items = clipboardRef.current;
    if (!items || !items.length) return;
    const page = docRef.current.pages.find((p) => p.id === docRef.current.activePageId);
    if (!page) return;
    const targetEntry = selEntries.length === 1 && isContainerType(selEntries[0].el.type) ? selEntries[0] : null;
    const newIds = [];
    const copies = items.map((item) => {
      const copy = cloneElementDeep(item.el, () => uid());
      copy.x = Math.round(item.absX + 16 - (targetEntry ? targetEntry.absX : 0));
      copy.y = Math.round(item.absY + 16 - (targetEntry ? targetEntry.absY : 0));
      newIds.push(copy.id);
      return copy;
    });
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== page.id) return p;
        if (!targetEntry) return { ...p, elements: [...p.elements, ...copies] };
        let elements = p.elements;
        for (const copy of copies) elements = appendToContainer(elements, targetEntry.el.id, copy);
        return { ...p, elements };
      })
    }));
    setSelIds(newIds);
  }
  function reorderSelection(mode) {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        let elements = p.elements;
        for (const id of ids) elements = reorderInTree(elements, id, mode);
        return { ...p, elements };
      })
    }));
  }
  function moveLayer(id, targetId, position) {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map(
        (p) => p.id === d.activePageId ? { ...p, elements: moveElementInTree(p.elements, id, targetId, position) } : p
      )
    }));
  }
  function startTextEdit(id, value) {
    setEditing({ id, value });
  }
  function changeText(id, value) {
    setEditing((cur) => cur && cur.id === id ? { id, value } : cur);
  }
  function commitText() {
    const cur = editingRef.current;
    setEditing(null);
    if (!cur) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({
        ...p,
        elements: replaceInTree(p.elements, cur.id, (el) => ({
          ...el,
          props: { ...el.props, text: cur.value }
        }))
      }))
    }));
  }
  function cancelText() {
    setEditing(null);
  }
  function togglePreview() {
    if (preview) {
      setPreview(false);
      setPreviewStack([]);
      setPreviewOverlay(null);
      return;
    }
    setPreviewStack([docRef.current.activePageId]);
    setPreviewOverlay(null);
    setSelIds([]);
    setEditing(null);
    setPreview(true);
  }
  function interact(el) {
    const link = (el.interactions || [])[0];
    if (!link) return;
    if (link.action === "back") {
      setPreviewStack((stack) => stack.length > 1 ? stack.slice(0, -1) : stack);
      return;
    }
    const page = docRef.current.pages.find((p) => p.id === link.targetPageId);
    if (!page) return;
    if (link.action === "openOverlay") setPreviewOverlay(page);
    else {
      setPreviewOverlay(null);
      setPreviewStack((stack) => [...stack, page.id]);
    }
  }
  function addPage() {
    const base = activePage;
    const page = {
      id: uid(),
      name: t("pages.default") + " " + (doc.pages.length + 1),
      frame: {
        w: base ? base.frame.w : 390,
        h: base ? base.frame.h : 844,
        preset: base ? base.frame.preset : "mobile",
        background: "#ffffff"
      },
      states: emptyStates(),
      elements: []
    };
    setDoc((d) => ({ ...d, pages: [...d.pages, page], activePageId: page.id }));
    setSelIds([]);
  }
  function duplicatePage(id) {
    const src = doc.pages.find((p) => p.id === id);
    if (!src) return;
    const copy = {
      id: uid(),
      name: src.name + " " + t("pages.copySuffix"),
      frame: { ...src.frame },
      states: JSON.parse(JSON.stringify(src.states || emptyStates())),
      elements: cloneElementDeep(
        { id: "root", type: "group", x: 0, y: 0, w: 0, h: 0, children: src.elements },
        () => uid()
      ).children
    };
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.slice();
      pages.splice(idx + 1, 0, copy);
      return { ...d, pages, activePageId: copy.id };
    });
    setSelIds([]);
  }
  function deletePage(id) {
    if (doc.pages.length <= 1) return;
    if (!window.confirm(t("pages.deleteConfirm"))) return;
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.filter((p) => p.id !== id);
      let active = d.activePageId;
      if (active === id) {
        const ni = Math.max(0, Math.min(pages.length - 1, idx - 1));
        active = pages[ni].id;
      }
      return { ...d, pages, activePageId: active };
    });
    setSelIds([]);
  }
  function addElement(type) {
    const target = activePage;
    if (!target) return;
    const info = TYPE_INFO[type];
    if (!info) return;
    const selectedEntry = selIds.length === 1 ? entryById.get(selIds[0]) : null;
    const parentEntry = selectedEntry && isContainerType(selectedEntry.el.type) ? selectedEntry : null;
    const parent = parentEntry ? parentEntry.el : null;
    const boundW = parent ? parent.w : target.frame.w;
    const boundH = parent ? parent.h : target.frame.h;
    let w = info.size[0];
    const hh = info.size[1];
    const fullWidth = type === "navbar" || type === "tabs";
    if (fullWidth) w = boundW;
    const n = (parent ? parent.children || [] : target.elements).length;
    const x = fullWidth ? 0 : parent ? 16 : 24;
    const y = fullWidth ? Math.min(24 + n % 6 * 16, Math.max(0, boundH - hh)) : 24 + n % 8 * 18;
    const props = type === "container" ? {
      name: t("comp.container") + " " + (n + 1),
      background: "#ffffff",
      radius: 12,
      clipContent: true
    } : {};
    const el = makeEl(
      type,
      Math.max(0, Math.min(x, boundW - w)),
      Math.max(0, Math.min(y, boundH - hh)),
      w,
      hh,
      props
    );
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== target.id) return p;
        if (!parent) return { ...p, elements: [...p.elements, el] };
        return { ...p, elements: appendToContainer(p.elements, parent.id, el) };
      })
    }));
    setSelIds([el.id]);
    setPreview(false);
  }
  function duplicateEl() {
    if (!selIds.length) return;
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    const rootIds = [];
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({
        ...p,
        elements: duplicateInTree(p.elements, ids, rootIds)
      }))
    }));
    if (rootIds.length) setSelIds(rootIds);
  }
  function deleteEl() {
    if (!selIds.length) return;
    const ids = new Set(selIds);
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: removeFromTree(p.elements, ids) }))
    }));
    setSelIds([]);
  }
  function bringFront() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, "front") }))
    }));
  }
  function sendBack() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, "back") }))
    }));
  }
  function setPreset(key) {
    const map = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const sz = map[key];
    if (!sz) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        const ow = p.frame.w || sz[0];
        const oh = p.frame.h || sz[1];
        const nw = sz[0];
        const nh = sz[1];
        const elements = scaleOnResize && (ow !== nw || oh !== nh) ? scaleElementsInTree(p.elements, nw / ow, nh / oh, Math.min(nw / ow, nh / oh)) : p.elements;
        return { ...p, frame: { ...p.frame, w: nw, h: nh, preset: key }, elements };
      })
    }));
  }
  function patchActiveFrame(patch) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map(
          (p) => p.id === d.activePageId ? { ...p, frame: { ...p.frame, ...patch } } : p
        )
      }),
      "frame:" + Object.keys(patch).join(",")
    );
  }
  function renameActivePage(name) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => p.id === d.activePageId ? { ...p, name } : p)
      }),
      "pagename:" + (activePage ? activePage.id : "")
    );
  }
  function topSelectedEntries() {
    return selEntries.filter((entry) => !isUnderAny(entry, selIds));
  }
  function groupSelection() {
    const entries = topSelectedEntries();
    if (entries.length < 2) return;
    const list = entries[0].list;
    if (!entries.every((entry) => entry.list === list)) return;
    const bounds = boundsOfEntries(entries);
    if (!bounds) return;
    const parentAbsX = entries[0].absX - entries[0].el.x;
    const parentAbsY = entries[0].absY - entries[0].el.y;
    const group = makeEl(
      "group",
      bounds.x - parentAbsX,
      bounds.y - parentAbsY,
      bounds.w,
      bounds.h,
      { name: t("comp.group") }
    );
    group.children = entries.map((entry) => {
      const copy = cloneElementDeep(entry.el);
      copy.x = entry.absX - bounds.x;
      copy.y = entry.absY - bounds.y;
      return copy;
    });
    const ids = new Set(entries.map((entry) => entry.el.id));
    const insertAt = Math.min(...entries.map((entry) => entry.index));
    const remaining = list.filter((el) => !ids.has(el.id));
    remaining.splice(insertAt, 0, group);
    const parentId = entries[0].parent ? entries[0].parent.id : null;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        if (!parentId) return { ...p, elements: remaining };
        return {
          ...p,
          elements: replaceInTree(p.elements, parentId, (el) => ({ ...el, children: remaining }))
        };
      })
    }));
    setSelIds([group.id]);
  }
  function ungroupSelection() {
    const entry = selEntries[0];
    if (!entry || entry.el.type !== "group") return;
    const group = entry.el;
    const kids = (group.children || []).map((child) => {
      const copy = cloneElementDeep(child);
      copy.x += group.x;
      copy.y += group.y;
      return copy;
    });
    const list = entry.list;
    const next = list.slice();
    next.splice(entry.index, 1, ...kids);
    const parentId = entry.parent ? entry.parent.id : null;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        if (!parentId) return { ...p, elements: next };
        return {
          ...p,
          elements: replaceInTree(p.elements, parentId, (el) => ({ ...el, children: next }))
        };
      })
    }));
    setSelIds(kids.map((k) => k.id));
  }
  function alignSelection(mode) {
    const entries = topSelectedEntries();
    if (!entries.length) return;
    const target = entries.length === 1 && activePage ? { x: 0, y: 0, w: activePage.frame.w, h: activePage.frame.h } : boundsOfEntries(entries);
    if (!target) return;
    const ids = new Set(entries.map((entry) => entry.el.id));
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => {
          if (p.id !== activePage.id) return p;
          return {
            ...p,
            elements: mapTree(p.elements, (el) => {
              if (!ids.has(el.id)) return el;
              const entry = findElementEntry(p.elements, el.id);
              if (!entry) return el;
              const parentAbsX = entry.absX - el.x;
              const parentAbsY = entry.absY - el.y;
              let absX = entry.absX;
              let absY = entry.absY;
              if (mode === "left") absX = target.x;
              else if (mode === "centerX") absX = target.x + (target.w - el.w) / 2;
              else if (mode === "right") absX = target.x + target.w - el.w;
              else if (mode === "top") absY = target.y;
              else if (mode === "centerY") absY = target.y + (target.h - el.h) / 2;
              else if (mode === "bottom") absY = target.y + target.h - el.h;
              return { ...el, x: Math.round(absX - parentAbsX), y: Math.round(absY - parentAbsY) };
            })
          };
        })
      }),
      "align:" + mode
    );
  }
  function distributeSelection(axis) {
    const entries = topSelectedEntries();
    if (entries.length < 3) return;
    const sorted = entries.slice().sort((a, b) => axis === "x" ? a.absX - b.absX : a.absY - b.absY);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const total = axis === "x" ? last.absX + last.w - first.absX : last.absY + last.h - first.absY;
    const sum = sorted.reduce((acc, entry) => acc + (axis === "x" ? entry.w : entry.h), 0);
    const gap = (total - sum) / (sorted.length - 1);
    let cursor = axis === "x" ? first.absX : first.absY;
    const positions = /* @__PURE__ */ new Map();
    for (const entry of sorted) {
      positions.set(entry.el.id, cursor);
      cursor += (axis === "x" ? entry.w : entry.h) + gap;
    }
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        return {
          ...p,
          elements: mapTree(p.elements, (el) => {
            if (!positions.has(el.id)) return el;
            const entry = findElementEntry(p.elements, el.id);
            if (!entry) return el;
            const parentAbs = axis === "x" ? entry.absX - el.x : entry.absY - el.y;
            const pos = Math.round(positions.get(el.id) - parentAbs);
            return axis === "x" ? { ...el, x: pos } : { ...el, y: pos };
          })
        };
      })
    }));
  }
  function snapTargets(page, excludeIds) {
    const targets = [{ x: 0, y: 0, w: page.frame.w, h: page.frame.h, id: "__frame__" }];
    for (const entry of collectElementEntries(page.elements)) {
      if (excludeIds.has(entry.el.id)) continue;
      targets.push({
        id: entry.el.id,
        x: entry.absX,
        y: entry.absY,
        w: entry.w,
        h: entry.h
      });
    }
    return targets;
  }
  function startDrag(ev, pageId, el) {
    if (preview) return;
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const page = docRef.current.pages.find((p) => p.id === pageId);
    if (!page) return;
    if (pageId !== activePage.id) setActivePage(pageId);
    let ids = selIds.slice();
    if (ev.shiftKey) {
      if (ids.includes(el.id)) {
        ids = ids.filter((id) => id !== el.id);
        setSelIds(ids);
        return;
      }
      ids = [...ids, el.id];
    } else if (!ids.includes(el.id) || ids.length > 1) {
      ids = [el.id];
    }
    setSelIds(ids);
    const allEntries = collectElementEntries(page.elements);
    const entries = ids.map((id) => allEntries.find((entry) => entry.el.id === id)).filter(Boolean);
    const top = entries.filter((entry) => !isUnderAny(entry, ids));
    if (!top.length) return;
    const box = boundsOfEntries(top);
    if (!box) return;
    const origins = new Map(top.map((entry) => [entry.el.id, { x: entry.el.x, y: entry.el.y }]));
    const exclude = /* @__PURE__ */ new Set();
    for (const entry of top) {
      exclude.add(entry.el.id);
      for (const id of descendantIds(entry.el)) exclude.add(id);
    }
    const targets = snapTargets(page, exclude);
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    let moved = false;
    let reparented = false;
    const move = (e2) => {
      const zoomNow = zoomRef.current || 1;
      let dx = Math.round((e2.clientX - sx) / zoomNow);
      let dy = Math.round((e2.clientY - sy) / zoomNow);
      if (snapRef.current) {
        const snapped = snapMoveBox(
          { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h },
          targets,
          SNAP_THRESHOLD / zoomNow
        );
        dx += snapped.dx;
        dy += snapped.dy;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }
      if (dx !== 0 || dy !== 0) moved = true;
      setDoc(
        (d) => ({
          ...d,
          pages: d.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              elements: mapTree(p.elements, (cur) => {
                const origin = origins.get(cur.id);
                if (!origin) return cur;
                return { ...cur, x: origin.x + dx, y: origin.y + dy };
              })
            };
          })
        }),
        false
      );
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setGuides([]);
      if (top.length === 1) {
        const currentPage = docRef.current.pages.find((p) => p.id === pageId);
        const entry = currentPage ? findElementEntry(currentPage.elements, top[0].el.id) : null;
        if (entry) {
          const cx = entry.absX + entry.w / 2;
          const cy = entry.absY + entry.h / 2;
          const excludeNow = /* @__PURE__ */ new Set([entry.el.id, ...descendantIds(entry.el)]);
          const target = findDropContainer(
            collectElementEntries(currentPage.elements),
            excludeNow,
            cx,
            cy
          );
          const parentId = entry.parent ? entry.parent.id : null;
          let nextParent = null;
          if (target && target.el.id !== parentId) nextParent = target.el.id;
          else if (entry.parent) {
            const parentBox = {
              x: entry.absX - entry.el.x,
              y: entry.absY - entry.el.y,
              w: entry.parent.w,
              h: entry.parent.h
            };
            if (!pointInBox(cx, cy, parentBox)) nextParent = null;
            else nextParent = parentId;
          }
          if (nextParent !== parentId) {
            reparented = reparentElement(entry.el.id, nextParent);
          }
        }
      }
      if ((moved || reparented) && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function reparentElement(elId, containerId) {
    let changed = false;
    setDoc((d) => {
      const page = d.pages.find((p) => p.id === d.activePageId);
      if (!page) return d;
      const entry = findElementEntry(page.elements, elId);
      if (!entry) return d;
      const target = containerId ? findElementEntry(page.elements, containerId) : null;
      if (containerId && (!target || !isContainerType(target.el.type))) return d;
      const absX = entry.absX;
      const absY = entry.absY;
      const targetAbsX = target ? target.absX : 0;
      const targetAbsY = target ? target.absY : 0;
      const extracted = extractFromTree2(page.elements, elId);
      if (!extracted.extracted) return d;
      const moved = {
        ...extracted.extracted,
        x: Math.round(absX - targetAbsX),
        y: Math.round(absY - targetAbsY)
      };
      const nextElements = containerId ? appendToContainer(extracted.elements, containerId, moved) : [...extracted.elements, moved];
      changed = true;
      return {
        ...d,
        pages: d.pages.map((p) => p.id === page.id ? { ...p, elements: nextElements } : p)
      };
    }, false);
    return changed;
  }
  function startResize(ev, el, dir) {
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const page = docRef.current.pages.find((p) => p.id === doc.activePageId);
    if (!page) return;
    const entry = findElementEntry(page.elements, el.id);
    if (!entry) return;
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const absX = entry.absX;
    const absY = entry.absY;
    const ow = entry.w;
    const oh = entry.h;
    const parentAbsX = absX - el.x;
    const parentAbsY = absY - el.y;
    const exclude = /* @__PURE__ */ new Set([el.id, ...descendantIds(el)]);
    const targets = snapTargets(page, exclude);
    let moved = false;
    const move = (e2) => {
      const zoomNow = zoomRef.current || 1;
      const dx = Math.round((e2.clientX - sx) / zoomNow);
      const dy = Math.round((e2.clientY - sy) / zoomNow);
      let next = { x: absX, y: absY, w: ow, h: oh };
      if (dir.indexOf("e") !== -1) next.w = ow + dx;
      if (dir.indexOf("s") !== -1) next.h = oh + dy;
      if (dir.indexOf("w") !== -1) {
        next.x = absX + dx;
        next.w = ow - dx;
      }
      if (dir.indexOf("n") !== -1) {
        next.y = absY + dy;
        next.h = oh - dy;
      }
      if (next.w < 12) {
        if (dir.indexOf("w") !== -1) next.x = absX + ow - 12;
        next.w = 12;
      }
      if (next.h < 8) {
        if (dir.indexOf("n") !== -1) next.y = absY + oh - 8;
        next.h = 8;
      }
      if (snapRef.current) {
        const snapped = snapResizeBox(next, dir, targets, SNAP_THRESHOLD / zoomNow);
        next = snapped.box;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }
      moved = true;
      mapEl(
        el.id,
        (cur) => ({
          ...cur,
          x: Math.round(next.x - parentAbsX),
          y: Math.round(next.y - parentAbsY),
          w: Math.round(next.w),
          h: Math.round(next.h)
        }),
        false
      );
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setGuides([]);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function startMarquee(ev, page) {
    if (preview || ev.button === 1 || spaceRef.current) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (page.id !== activePage.id) setActivePage(page.id);
    const frameEl = ev.currentTarget;
    const rect = frameEl.getBoundingClientRect();
    const zoomNow = zoomRef.current || 1;
    const start = {
      x: (ev.clientX - rect.left) / zoomNow,
      y: (ev.clientY - rect.top) / zoomNow
    };
    const shift = ev.shiftKey;
    const baseSel = shift ? selIds.slice() : [];
    let moved = false;
    const move = (e2) => {
      const cur = {
        x: (e2.clientX - rect.left) / zoomNow,
        y: (e2.clientY - rect.top) / zoomNow
      };
      if (Math.abs(cur.x - start.x) > 1 || Math.abs(cur.y - start.y) > 1) moved = true;
      const box = {
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        w: Math.abs(cur.x - start.x),
        h: Math.abs(cur.y - start.y)
      };
      setMarquee({ pageId: page.id, ...box });
      const entries = collectElementEntries(page.elements).filter(
        (entry) => entry.depth === 0 && !entry.el.hidden
      );
      const ids = entries.filter(
        (entry) => entry.absX < box.x + box.w && entry.absX + entry.w > box.x && entry.absY < box.y + box.h && entry.absY + entry.h > box.y
      ).map((entry) => entry.el.id);
      setSelIds(Array.from(/* @__PURE__ */ new Set([...baseSel, ...ids])));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setMarquee(null);
      if (!moved) setSelIds(shift ? baseSel : []);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function startPan(ev) {
    const el = canvasRef.current;
    if (!el) return;
    ev.preventDefault();
    const sx = ev.clientX;
    const sy = ev.clientY;
    const sl = el.scrollLeft;
    const st = el.scrollTop;
    setPanning(true);
    const move = (e2) => {
      el.scrollLeft = sl - (e2.clientX - sx);
      el.scrollTop = st - (e2.clientY - sy);
    };
    const up = () => {
      setPanning(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function startResizeLeft(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const sx = ev.clientX;
    const sw = leftWidth;
    const move = (e2) => {
      const nw = Math.max(168, Math.min(460, Math.round(sw + (e2.clientX - sx))));
      setLeftWidth(nw);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function startResizeRight(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (rightCollapsed) return;
    const sx = ev.clientX;
    const sw = rightWidth;
    const move = (e2) => {
      const nw = Math.max(200, Math.min(520, Math.round(sw - (e2.clientX - sx))));
      setRightWidth(nw);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function renderStateFor(el) {
    const base = el.state || defaultState(el.type);
    if (!preview) return base;
    const u = ui[el.id] || {};
    if (el.type === "button") {
      if (base === "disabled") return "disabled";
      if (u.press) return "active";
      if (u.hover) return "hover";
      return base;
    }
    if (el.type === "card") return u.hover ? "hover" : base;
    if (el.type === "input") return u.focus ? "focus" : base;
    return base;
  }
  function activate(el, ev) {
    if (!preview) return;
    const ty = el.type;
    if (ty === "toggle") setEl(el.id, { state: (el.state || "on") === "on" ? "off" : "on" });
    else if (ty === "checkbox")
      setEl(el.id, { state: el.state === "checked" ? "unchecked" : "checked" });
    else if (ty === "select") setEl(el.id, { state: el.state === "open" ? "default" : "open" });
    else if (ty === "input") setUiFor(el.id, { focus: true });
    else if (ty === "tabs") {
      const rect = ev.currentTarget.getBoundingClientRect();
      const count = (el.props.text || t("sample.tabs")).split(",").length || 1;
      const idx = Math.min(
        count - 1,
        Math.max(0, Math.floor((ev.clientX - rect.left) / rect.width * count))
      );
      setUiFor(el.id, { tabs: idx });
    }
  }
  const canUndo = histRef.current.past.length > 0;
  const canRedo = histRef.current.future.length > 0;
  const viewPage = preview ? doc.pages.find((p) => p.id === previewStack[previewStack.length - 1]) || activePage : activePage;
  const crumbEntry = selEntries[0];
  const breadcrumb = activePage ? [
    { id: activePage.id, label: activePage.name },
    ...crumbEntry ? crumbEntry.ancestors.map((id) => {
      const e = entryById.get(id);
      return {
        id,
        label: e ? e.el.name || e.el.props.name || t("comp." + e.el.type) : id
      };
    }) : [],
    ...crumbEntry ? [
      {
        id: crumbEntry.el.id,
        label: crumbEntry.el.name || crumbEntry.el.props.text || t("comp." + crumbEntry.el.type)
      }
    ] : []
  ] : [];
  const ctxEl = selEntries[0] ? selEntries[0].el : null;
  const menuItems = ctxMenu ? [
    { label: t("ctx.copy"), key: "\u2318C", onClick: copySelection, disabled: !selIds.length },
    { label: t("ctx.cut"), key: "\u2318X", onClick: cutSelection, disabled: !selIds.length },
    {
      label: t("ctx.paste"),
      key: "\u2318V",
      onClick: pasteClipboard,
      disabled: clipboardRef.current.length === 0
    },
    { sep: true },
    { label: t("ctx.duplicate"), key: "\u2318D", onClick: duplicateEl, disabled: !selIds.length },
    { sep: true },
    {
      label: t("ctx.front"),
      onClick: () => reorderSelection("front"),
      disabled: !selIds.length
    },
    {
      label: t("ctx.forward"),
      key: "\u2318]",
      onClick: () => reorderSelection("forward"),
      disabled: !selIds.length
    },
    {
      label: t("ctx.backward"),
      key: "\u2318[",
      onClick: () => reorderSelection("backward"),
      disabled: !selIds.length
    },
    { label: t("ctx.back"), onClick: () => reorderSelection("back"), disabled: !selIds.length },
    { sep: true },
    {
      label: t("ctx.group"),
      key: "\u2318G",
      onClick: groupSelection,
      disabled: selEntries.length < 2
    },
    ...ctxEl && ctxEl.type === "group" ? [{ label: t("ctx.ungroup"), key: "\u21E7\u2318G", onClick: ungroupSelection }] : [],
    ...ctxEl ? [
      {
        label: ctxEl.hidden ? t("ctx.show") : t("ctx.hide"),
        onClick: () => setEl(ctxEl.id, { hidden: !ctxEl.hidden })
      },
      {
        label: ctxEl.locked ? t("ctx.unlock") : t("ctx.lock"),
        onClick: () => setEl(ctxEl.id, { locked: !ctxEl.locked })
      }
    ] : [],
    { sep: true },
    {
      label: t("ctx.delete"),
      key: "\u232B",
      onClick: deleteEl,
      danger: true,
      disabled: !selIds.length
    }
  ] : null;
  return h(
    "div",
    {
      className: "dpd-root" + (preview ? " dpd-previewMode" : ""),
      "data-dsh-plugin": "product-design"
    },
    h(StyleBlock),
    preview ? null : h(ToolbarView, {
      t,
      doc,
      setDoc,
      activePage,
      setPreset,
      pageState,
      setPageState,
      zoom,
      setZoom,
      preview,
      togglePreview,
      undo,
      redo,
      canUndo,
      canRedo,
      setSelId: (id) => setSelIds(id ? [id] : []),
      snapEnabled,
      toggleSnap: () => {
        setSnapEnabled((v) => !v);
        setGuides([]);
      }
    }),
    h(
      "div",
      { className: "dpd-body" },
      preview ? null : h(LeftView, {
        t,
        doc,
        activePage,
        setActivePage,
        addPage,
        duplicatePage,
        deletePage,
        addElement,
        section,
        setSection,
        leftWidth,
        startResizeLeft,
        selIds,
        setSelId: (id) => setSelIds(id ? [id] : []),
        setPreview,
        setEl,
        onLayerMove: moveLayer,
        layerQuery,
        setLayerQuery
      }),
      h(CanvasView, {
        t,
        doc,
        activePage: viewPage,
        zoom,
        selIds,
        selBoxes,
        multiBounds,
        sel,
        preview,
        pageState,
        ui,
        canvasRef,
        spaceRef,
        spaceDown,
        panning,
        guides,
        marquee,
        hoverId,
        editing,
        breadcrumb,
        overlayPage: previewOverlay,
        renderStateFor,
        startDrag,
        startResize,
        startMarquee,
        startPan,
        setSelId: (id) => setSelIds(id ? [id] : []),
        setActivePage,
        setUi,
        setUiFor,
        activate,
        setHoverId,
        onContextMenu: (ev, el) => {
          if (el) {
            if (!selIds.includes(el.id)) setSelIds([el.id]);
          } else {
            setSelIds([]);
          }
          setCtxMenu({ x: ev.clientX, y: ev.clientY });
        },
        onInteract: interact,
        onStartTextEdit: startTextEdit,
        onTextChange: changeText,
        onTextCommit: commitText,
        onTextCancel: cancelText,
        onCloseOverlay: () => setPreviewOverlay(null)
      }),
      preview ? null : h(InspectorView, {
        t,
        doc,
        sel,
        selCount: selEntries.length,
        activePage,
        pageState,
        scaleOnResize,
        setScaleOnResize,
        setEl,
        applyAttrs,
        applyProps,
        duplicateEl,
        bringFront,
        sendBack,
        deleteEl,
        setPreset,
        renameActivePage,
        patchActiveFrame,
        patchPageStates,
        alignSelection,
        distributeSelection,
        groupSelection,
        ungroupSelection,
        rightWidth,
        rightCollapsed,
        toggleRight: () => setRightCollapsed((v) => !v),
        startResizeRight
      })
    ),
    preview && previewStack.length > 1 ? h(
      "div",
      { className: "dpd-previewNav" },
      h(
        "button",
        {
          type: "button",
          onClick: () => setPreviewStack((stack) => stack.slice(0, -1))
        },
        "\u2039 " + t("preview.back")
      )
    ) : null,
    preview ? h(
      "button",
      {
        className: "dpd-previewExit",
        type: "button",
        title: t("toolbar.exitPreview"),
        onClick: () => {
          setPreview(false);
          setPreviewStack([]);
          setPreviewOverlay(null);
        }
      },
      t("toolbar.exitPreview")
    ) : null,
    ctxMenu ? h(
      "div",
      {
        className: "dpd-ctxmenu",
        style: {
          left: Math.max(4, Math.min(ctxMenu.x, (window.innerWidth || 1200) - 200)),
          top: Math.max(4, Math.min(ctxMenu.y, (window.innerHeight || 800) - 380))
        },
        onMouseDown: (e) => e.stopPropagation(),
        onContextMenu: (e) => e.preventDefault()
      },
      menuItems.map(
        (item, i) => item.sep ? h("div", { key: "sep" + i, className: "dpd-ctxsep" }) : h(
          "button",
          {
            key: item.label + i,
            type: "button",
            disabled: item.disabled,
            className: item.danger ? "danger" : "",
            onClick: () => {
              setCtxMenu(null);
              item.onClick();
            }
          },
          h("span", null, item.label),
          item.key ? h("span", { className: "k" }, item.key) : null
        )
      )
    ) : null
  );
}

// src/client/index.js
var inject = ["slots", "layout"];
function apply(ctx) {
  setAppCtx(ctx);
  const bindSession = (scope) => {
    try {
      const service = scope && scope.get && scope.get("uiSession") || ctx.get("uiSession");
      if (service && service.adapter) setSessionSource(service.adapter);
    } catch (e) {
    }
  };
  bindSession(ctx);
  if (typeof ctx.inject === "function") ctx.inject(["uiSession"], bindSession);
  setCanvasOpener(() => {
    try {
      const layout = ctx.get("layout");
      if (layout && typeof layout.selectPanel === "function") layout.selectPanel(PANEL_ID);
    } catch (e) {
    }
  });
  let loc = null;
  try {
    loc = ctx.get("locale");
  } catch (e) {
    loc = null;
  }
  if (loc && typeof loc.register === "function") {
    ctx.effect(() => {
      const disposes = [];
      try {
        disposes.push(loc.register(NS, "zh", DICT.zh));
      } catch (e) {
      }
      try {
        disposes.push(loc.register(NS, "en", DICT.en));
      } catch (e) {
      }
      return () => {
        for (const d of disposes) {
          try {
            d();
          } catch (e) {
          }
        }
      };
    });
  }
  const slots = ctx.slots;
  const disposers = [];
  disposers.push(registerProductDesignCards(ctx));
  disposers.push(
    slots.inject(
      "sidebar.panellist",
      () => slots.register(
        {
          name: "sidebar.panellist",
          id: PANEL_ID,
          order: 30,
          label: () => pickDict(activeLocale(), "entry.label")
        },
        ProductDesignIcon
      )
    )
  );
  disposers.push(
    slots.inject(
      "main",
      () => slots.register(
        {
          name: "main",
          key: PANEL_ID
        },
        ProductDesignPanel
      )
    )
  );
  return () => {
    for (const d of disposers.splice(0)) {
      try {
        d();
      } catch (e) {
      }
    }
  };
}
    return module.exports;
  },
});
