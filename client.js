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

// src/client/constants.js
var NS = "dsh-product-design";
var PANEL_ID = "dsh-product-design";
var STORAGE_KEY = "dsh-product-design:doc:v2";
var LEGACY_KEY = "dsh-product-design:doc:v1";
var UI_KEY = "dsh-product-design:ui:v1";
var API_PREFIX = "/dsh-product-design/api";
var ACCENT = "#6366f1";
var TYPE_INFO = {
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
    "toolbar.reset": "\u91CD\u7F6E",
    "toolbar.resetConfirm": "\u786E\u5B9A\u91CD\u7F6E\u4E3A\u793A\u4F8B\u8BBE\u8BA1\uFF1F\u5F53\u524D\u6240\u6709\u9875\u9762\u5C06\u88AB\u6E05\u7A7A\u3002",
    "toolbar.saved": "\u5DF2\u81EA\u52A8\u4FDD\u5B58",
    "toolbar.undo": "\u64A4\u9500 (\u2318Z)",
    "toolbar.redo": "\u91CD\u505A (\u21E7\u2318Z)",
    "toolbar.panHint": "\u7A7A\u683C / \u4E2D\u952E\u62D6\u62FD\u5E73\u79FB\u753B\u5E03",
    "command.canvas.label": "\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03",
    "command.canvas.desc": "\u6253\u5F00\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03\uFF0C\u5F00\u59CB\u642D\u539F\u578B",
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
    "layers.title": "\u56FE\u5C42",
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
    "overlay.errorBtn": "\u91CD\u8BD5"
  },
  en: {
    "entry.label": "Product Design",
    "app.title": "Product Design Canvas",
    "name.placeholder": "Untitled design",
    "toolbar.preview": "Preview",
    "toolbar.edit": "Edit",
    "toolbar.reset": "Reset",
    "toolbar.resetConfirm": "Reset to the sample design? All pages will be cleared.",
    "toolbar.saved": "Auto-saved",
    "toolbar.undo": "Undo (\u2318Z)",
    "toolbar.redo": "Redo (\u21E7\u2318Z)",
    "toolbar.panHint": "Hold Space / middle-drag to pan the canvas",
    "command.canvas.label": "Product Design Canvas",
    "command.canvas.desc": "Open the product design canvas to build a prototype",
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
    "layers.title": "Layers",
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
    "overlay.errorBtn": "Retry"
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
var IconReset = () => h(Svg, null, h("path", { d: "M3 8a5 5 0 1 0 1.6-3.7M3 3.2V6h2.8" }));
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
function libGlyph(type) {
  const map = {
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

// src/client/model.js
var __seq = 1;
function uid() {
  return "e" + Date.now().toString(36) + (__seq++).toString(36);
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
    props: props || {}
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
    elements: starterElements(t)
  };
  return { name: "", pages: [page], activePageId: page.id };
}
function normalizeDoc(doc) {
  if (!doc) return null;
  if (Array.isArray(doc.pages) && doc.pages.length) {
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
        elements: p.elements
      };
    });
    if (!pages.length) return null;
    const activePageId = pages.some((p) => p.id === doc.activePageId) ? doc.activePageId : pages[0].id;
    return { name: doc.name || "", pages, activePageId };
  }
  if (doc.frame && Array.isArray(doc.elements)) {
    const fr = doc.frame;
    const page = {
      id: uid(),
      name: "Page 1",
      frame: {
        w: fr.w || 390,
        h: fr.h || 844,
        preset: fr.preset || "mobile",
        background: fr.background || "#ffffff"
      },
      elements: doc.elements
    };
    return { name: doc.name || "", pages: [page], activePageId: page.id };
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
function apiFetch(path, init) {
  if (typeof fetch !== "function") return Promise.resolve(null);
  let url;
  try {
    url = new URL(
      API_PREFIX + path,
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

// src/client/overlay.js
function PageOverlay(props) {
  const { pageState, t } = props;
  if (pageState === "loading") {
    return h(
      "div",
      { className: "dpd-overlay" },
      h("div", { className: "dpd-spinner" }),
      h("div", { className: "dpd-overlayDesc" }, t("overlay.loading"))
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
      h("div", { className: "dpd-overlayTitle" }, t("overlay.emptyTitle")),
      h("div", { className: "dpd-overlayDesc" }, t("overlay.emptyDesc"))
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
      h("div", { className: "dpd-overlayTitle" }, t("overlay.errorTitle")),
      h("div", { className: "dpd-overlayDesc" }, t("overlay.errorDesc"))
    );
  }
  return null;
}

// src/client/styles.js
var CSS = [
  ".dpd-root{display:flex;flex-direction:column;height:100%;width:100%;min-height:0;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);font-size:13px;font-family:inherit;overflow:hidden}",
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
  ".dpd-resizer:hover{background:var(--dsw-alias-border-l2,#d6d9e2)}",
  ".dpd-right{width:242px;flex-shrink:0;border-left:1px solid var(--dsw-alias-border-l1,#e5e6eb);background:var(--dsw-alias-bg-layer-1,#fafafa);display:flex;flex-direction:column;min-height:0;overflow:auto}",
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
  ".dpd-canvas{flex:1;min-width:0;overflow:auto;background-color:var(--dsw-alias-bg-layer-2,#f0f1f4);position:relative}",
  ".dpd-canvasinner{display:flex;align-items:flex-start;justify-content:center;min-width:100%;min-height:100%;width:max-content;box-sizing:border-box;padding:32px}",
  ".dpd-stage{position:relative;flex-shrink:0}",
  ".dpd-world{position:absolute;top:0;left:0}",
  ".dpd-frame{position:absolute;border-radius:18px;box-shadow:0 14px 44px rgba(17,24,39,.20),0 0 0 1px rgba(17,24,39,.06);overflow:hidden}",
  ".dpd-pageLabel{position:absolute;display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;padding:0 2px;overflow:hidden}",
  ".dpd-pageLabel .pin{font-weight:600;color:var(--dsw-alias-label-primary,#111);overflow:hidden;text-overflow:ellipsis;max-width:60%}",
  ".dpd-pageLabel .sz{font-variant-numeric:tabular-nums;opacity:.75}",
  ".dpd-pageLabel.active .pin{color:var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-el{position:absolute;box-sizing:border-box}",
  ".dpd-el.dpd-sel{outline:1.5px solid var(--dsw-alias-brand-primary,#6366f1)}",
  ".dpd-selBox{position:absolute;pointer-events:none;border:1.5px solid var(--dsw-alias-brand-primary,#6366f1);z-index:40}",
  ".dpd-handle{position:absolute;width:10px;height:10px;background:#fff;border:1.5px solid var(--dsw-alias-brand-primary,#6366f1);border-radius:2px}",
  ".dpd-handle.br{right:-6px;bottom:-6px;pointer-events:auto;cursor:nwse-resize}",
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
  ".dpd-layer .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".dpd-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,.9);z-index:60;text-align:center;padding:24px}",
  ".dpd-overlayTitle{font-size:15px;font-weight:600;color:#161a22}",
  ".dpd-overlayDesc{font-size:12.5px;color:#6b7280;max-width:240px;line-height:1.5}",
  ".dpd-spinner{width:28px;height:28px;border:3px solid rgba(99,102,241,.22);border-top-color:#6366f1;border-radius:50%;animation:dpd-spin .8s linear infinite}",
  "@keyframes dpd-spin{to{transform:rotate(360deg)}}"
].join("\n");
function StyleBlock() {
  return h("style", { dangerouslySetInnerHTML: { __html: CSS } });
}

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

// src/client/panel.js
var GAP = 72;
var LABEL = 30;
function ProductDesignPanel() {
  const t = useT();
  const [doc, setDocState] = useState2(() => loadDoc() || defaultDoc(t));
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
      }
      h2.future = [];
    }
    docRef.current = next;
    setDocState(next);
  }, []);
  const [selId, setSelId] = useState2(null);
  const [preview, setPreview] = useState2(false);
  const [pageState, setPageState] = useState2("normal");
  const [zoom, setZoom] = useState2(1);
  const [ui, setUi] = useState2({});
  const [spaceDown, setSpaceDown] = useState2(false);
  const spaceRef = useRef(false);
  const [panning, setPanning] = useState2(false);
  const [leftWidth, setLeftWidth] = useState2(() => {
    const w = Number(loadUi().leftWidth);
    return w >= 168 && w <= 460 ? w : 264;
  });
  const [section, setSection] = useState2(() => {
    const s = loadUi().section;
    return s === null || s === "pages" || s === "components" || s === "layers" ? s : "pages";
  });
  const hostRef = useRef({ on: false, revision: 0, suppressSave: false });
  useEffect2(() => {
    saveDoc(doc);
    if (hostRef.current.suppressSave) {
      hostRef.current.suppressSave = false;
      return void 0;
    }
    if (!hostRef.current.on) return void 0;
    const timer = setTimeout(() => {
      apiFetch("/doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseRevision: hostRef.current.revision, doc })
      }).then((res) => {
        if (!res) return;
        if (res.status === 200 && res.body) {
          hostRef.current.revision = res.body.revision;
        } else if (res.status === 409 && res.body && res.body.doc) {
          const nd = normalizeDoc(res.body.doc);
          if (nd) {
            hostRef.current.revision = res.body.revision;
            hostRef.current.suppressSave = true;
            docRef.current = nd;
            setDocState(nd);
          }
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);
  useEffect2(() => {
    let cancelled = false;
    let source = null;
    (async () => {
      const canStream = typeof window.EventSource === "function";
      const attempts = canStream ? 6 : 1;
      let got = null;
      for (let i = 0; i < attempts && !cancelled; i += 1) {
        got = await apiFetch("/doc");
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
        const seeded = await apiFetch("/doc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ baseRevision: hostRef.current.revision, doc: docRef.current })
        });
        if (seeded && seeded.status === 200 && seeded.body)
          hostRef.current.revision = seeded.body.revision;
      }
      if (cancelled || typeof window.EventSource !== "function") return;
      try {
        source = new window.EventSource(
          new URL(API_PREFIX + "/events", window.location.href).toString()
        );
        source.onmessage = (evt) => {
          let data = null;
          try {
            data = JSON.parse(evt.data);
          } catch (e) {
            data = null;
          }
          if (!data || typeof data.revision !== "number" || data.revision === hostRef.current.revision)
            return;
          apiFetch("/doc").then((snap) => {
            if (!snap || snap.status !== 200 || !snap.body || !snap.body.doc) return;
            const nd = normalizeDoc(snap.body.doc);
            if (!nd) return;
            hostRef.current.revision = snap.body.revision;
            hostRef.current.suppressSave = true;
            docRef.current = nd;
            setDocState(nd);
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
  }, []);
  useEffect2(() => {
    saveUi({ leftWidth, section });
  }, [leftWidth, section]);
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
    if (mod && (k === "d" || k === "D")) {
      e.preventDefault();
      duplicateEl();
      return;
    }
    if (k === "Escape") {
      if (preview) setPreview(false);
      else setSelId(null);
      return;
    }
    if (preview) return;
    if (!selId) return;
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
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  const setActivePage = useCallback2((id) => setDoc((d) => ({ ...d, activePageId: id })), []);
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
            elements: p.elements.map((e) => e.id === elId ? fn(e) : e)
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
    if (!selId) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: p.elements.map(
            (e) => e.id === selId ? { ...e, x: e.x + dx, y: e.y + dy } : e
          )
        }))
      }),
      "nudge:" + selId
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
  let sel = null;
  let selPage = null;
  if (selId) {
    for (const p of doc.pages) {
      const e = p.elements.find((x) => x.id === selId);
      if (e) {
        sel = e;
        selPage = p;
        break;
      }
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
      elements: []
    };
    setDoc((d) => ({ ...d, pages: [...d.pages, page], activePageId: page.id }));
  }
  function duplicatePage(id) {
    const src = doc.pages.find((p) => p.id === id);
    if (!src) return;
    const copy = {
      id: uid(),
      name: src.name + " " + t("pages.copySuffix"),
      frame: { ...src.frame },
      elements: src.elements.map((e) => ({ ...e, id: uid(), props: { ...e.props } }))
    };
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.slice();
      pages.splice(idx + 1, 0, copy);
      return { ...d, pages, activePageId: copy.id };
    });
  }
  function deletePage(id) {
    if (doc.pages.length <= 1) return;
    if (!window.confirm(t("pages.deleteConfirm"))) return;
    const removing = doc.pages.find((p) => p.id === id);
    if (removing && selId && removing.elements.some((e) => e.id === selId)) setSelId(null);
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
  }
  function addElement(type) {
    const target = activePage;
    if (!target) return;
    const info = TYPE_INFO[type];
    let w = info.size[0];
    const hh = info.size[1];
    const fullWidth = type === "navbar" || type === "tabs";
    if (fullWidth) w = target.frame.w;
    const n = target.elements.length;
    const x = fullWidth ? 0 : 24;
    const y = fullWidth ? Math.min(24 + n % 6 * 16, target.frame.h - hh) : 24 + n % 8 * 18;
    const el = makeEl(
      type,
      Math.max(0, Math.min(x, target.frame.w - w)),
      Math.max(0, Math.min(y, target.frame.h - hh)),
      w,
      hh
    );
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => p.id === target.id ? { ...p, elements: [...p.elements, el] } : p)
    }));
    setSelId(el.id);
    setPreview(false);
  }
  function duplicateEl() {
    if (!sel || !selPage) return;
    const c = { ...sel, id: uid(), x: sel.x + 16, y: sel.y + 16, props: { ...sel.props } };
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => p.id === selPage.id ? { ...p, elements: [...p.elements, c] } : p)
    }));
    setSelId(c.id);
  }
  function deleteEl() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== selId) }))
    }));
    setSelId(null);
  }
  function bringFront() {
    if (!sel || !selPage) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map(
        (p) => p.id === selPage.id ? { ...p, elements: [...p.elements.filter((e) => e.id !== selId), sel] } : p
      )
    }));
  }
  function sendBack() {
    if (!sel || !selPage) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map(
        (p) => p.id === selPage.id ? { ...p, elements: [sel, ...p.elements.filter((e) => e.id !== selId)] } : p
      )
    }));
  }
  function resetDoc() {
    if (window.confirm(t("toolbar.resetConfirm"))) {
      setDoc(defaultDoc(t));
      setSelId(null);
      setPageState("normal");
      setPreview(false);
    }
  }
  function setPreset(key) {
    const map = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const sz = map[key];
    if (!sz) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        const nw = sz[0];
        const nh = sz[1];
        const frame = { ...p.frame, w: nw, h: nh, preset: key };
        const ow = p.frame.w || nw;
        const oh = p.frame.h || nh;
        if (ow === nw && oh === nh) return { ...p, frame };
        const s = Math.min(nw / ow, nh / oh);
        const scaleEl = (e) => {
          const props = { ...e.props };
          if (typeof props.fontSize === "number")
            props.fontSize = Math.max(8, Math.round(props.fontSize * s));
          if (typeof props.radius === "number")
            props.radius = Math.max(0, Math.round(props.radius * s));
          return {
            ...e,
            x: Math.round(e.x * s),
            y: Math.round(e.y * s),
            w: Math.max(12, Math.round(e.w * s)),
            h: Math.max(8, Math.round(e.h * s)),
            props
          };
        };
        return { ...p, frame, elements: p.elements.map(scaleEl) };
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
  function startDrag(ev, pageId, el) {
    if (preview) return;
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    setSelId(el.id);
    setActivePage(pageId);
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const ox = el.x;
    const oy = el.y;
    let moved = false;
    const move = (e2) => {
      const nx = Math.round(ox + (e2.clientX - sx) / zoom);
      const ny = Math.round(oy + (e2.clientY - sy) / zoom);
      if (nx !== ox || ny !== oy) moved = true;
      mapEl(el.id, (x) => ({ ...x, x: nx, y: ny }), false);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function startResize(ev, el) {
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const ow = el.w;
    const oh = el.h;
    let moved = false;
    const move = (e2) => {
      const nw = Math.max(20, Math.round(ow + (e2.clientX - sx) / zoom));
      const nh = Math.max(16, Math.round(oh + (e2.clientY - sy) / zoom));
      if (nw !== ow || nh !== oh) moved = true;
      mapEl(el.id, (x) => ({ ...x, w: nw, h: nh }), false);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
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
  const stateLabels = {
    normal: "state.normal",
    loading: "state.loading",
    empty: "state.empty",
    error: "state.error"
  };
  const canUndo = histRef.current.past.length > 0;
  const canRedo = histRef.current.future.length > 0;
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
        className: "dpd-iconbtn",
        type: "button",
        title: "\u7F29\u5C0F",
        onClick: () => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10))
      },
      h(IconMinus)
    ),
    h(
      "button",
      { className: "dpd-zoom", type: "button", title: "\u91CD\u7F6E\u4E3A 100%", onClick: () => setZoom(1) },
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
          setPreview((v) => !v);
          setSelId(null);
        }
      },
      h(preview ? IconPencil : IconEye),
      preview ? t("toolbar.edit") : t("toolbar.preview")
    ),
    h(
      "button",
      { className: "dpd-iconbtn", type: "button", title: t("toolbar.reset"), onClick: resetDoc },
      h(IconReset)
    ),
    h("span", { className: "dpd-saved" }, t("toolbar.saved"))
  );
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
  const layers = activeElements.slice().reverse();
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
      { className: "dpd-layers" },
      layers.map(
        (el) => h(
          "div",
          {
            key: el.id,
            className: "dpd-layer" + (selId === el.id ? " active" : ""),
            onClick: () => {
              setSelId(el.id);
              setPreview(false);
              setActivePage(activePage.id);
            }
          },
          h("span", { className: "dot" }, h(Svg, { size: 13 }, libGlyph(el.type))),
          h("span", { className: "nm" }, el.props.text || t("comp." + el.type))
        )
      )
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
  const positions = {};
  let cursorX = 0;
  doc.pages.forEach((p) => {
    positions[p.id] = cursorX;
    cursorX += p.frame.w + GAP;
  });
  const totalW = Math.max(1, cursorX - GAP);
  const maxH = doc.pages.reduce((m, p) => Math.max(m, p.frame.h), 0);
  const worldW = totalW;
  const worldH = LABEL + maxH;
  const pageLabels = doc.pages.map(
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
  const frameNodes = doc.pages.map((p) => {
    const pageActive = p.id === activePage.id;
    const els = p.elements.map((el) => {
      const st = renderStateFor(el);
      const u = ui[el.id] || {};
      const info = TYPE_INFO[el.type] || TYPE_INFO.text;
      const cursor = spaceDown ? panning ? "grabbing" : "grab" : preview ? info.interactive ? "pointer" : "default" : "move";
      return h(
        "div",
        {
          key: el.id,
          className: "dpd-el" + (selId === el.id && !preview ? " dpd-sel" : ""),
          style: { left: el.x, top: el.y, width: el.w, height: el.h, cursor },
          onMouseDown: (ev) => {
            if (ev.button === 1 || spaceRef.current) return;
            if (preview) {
              if (el.type === "button") setUiFor(el.id, { press: true });
              return;
            }
            startDrag(ev, p.id, el);
          },
          onMouseEnter: () => {
            if (preview && (el.type === "button" || el.type === "card"))
              setUiFor(el.id, { hover: true });
          },
          onMouseLeave: () => {
            if (preview) setUiFor(el.id, { hover: false, press: false });
          },
          onMouseUp: () => {
            if (preview && el.type === "button") setUiFor(el.id, { press: false });
          },
          onClick: (ev) => {
            if (preview) {
              ev.stopPropagation();
              activate(el, ev);
            }
          }
        },
        h(
          "div",
          { style: { width: "100%", height: "100%", pointerEvents: "none" } },
          renderWidget(el, st, t, { tabsActive: u.tabs, preview })
        )
      );
    });
    const selNode = sel && selPage && selPage.id === p.id && !preview ? h(
      "div",
      {
        className: "dpd-selBox",
        style: { left: sel.x, top: sel.y, width: sel.w, height: sel.h }
      },
      h("div", { className: "dpd-handle br", onMouseDown: (ev) => startResize(ev, sel) })
    ) : null;
    const overlay = pageActive && pageState !== "normal" ? h(PageOverlay, { pageState, t }) : null;
    return h(
      "div",
      {
        key: p.id,
        className: "dpd-frame",
        style: {
          left: positions[p.id],
          top: LABEL,
          width: p.frame.w,
          height: p.frame.h,
          background: p.frame.background || "#ffffff"
        },
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return;
          ev.stopPropagation();
          setActivePage(p.id);
          if (!preview) setSelId(null);
        }
      },
      els,
      selNode,
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
      className: "dpd-canvas",
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
      }
    },
    h(
      "div",
      {
        className: "dpd-canvasinner",
        style: { backgroundImage: gridImage, backgroundSize: gridSize, backgroundPosition: "0 0" }
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
    )
  );
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
  let inspectorBody;
  if (sel) {
    const info = TYPE_INFO[sel.type] || TYPE_INFO.text;
    const stateList = info.states || ["default"];
    inspectorBody = h(
      "div",
      null,
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
            numInput(sel.x, (v) => setEl(sel.id, { x: v }, "x:" + sel.id))
          ),
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "Y"),
            numInput(sel.y, (v) => setEl(sel.id, { y: v }, "y:" + sel.id))
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
            numInput(sel.w, (v) => setEl(sel.id, { w: Math.max(16, v) }, "w:" + sel.id))
          ),
          h(
            "div",
            { className: "dpd-field" },
            h("span", null, "H"),
            numInput(sel.h, (v) => setEl(sel.id, { h: Math.max(12, v) }, "h:" + sel.id))
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
          onChange: (e) => setElProps(sel.id, { text: e.target.value }, "text:" + sel.id)
        })
      ) : null,
      info.hasColor || info.hasText ? h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.color")),
        h("input", {
          className: "dpd-color",
          type: "color",
          value: sel.props.color || ACCENT,
          onChange: (e) => setElProps(sel.id, { color: e.target.value }, "color:" + sel.id)
        }),
        h("input", {
          className: "dpd-input",
          type: "text",
          value: sel.props.color || ACCENT,
          onChange: (e) => setElProps(sel.id, { color: e.target.value }, "color:" + sel.id)
        })
      ) : null,
      info.hasFont ? h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.fontSize")),
        numInput(
          sel.props.fontSize || 14,
          (v) => setElProps(sel.id, { fontSize: v }, "fs:" + sel.id)
        )
      ) : null,
      h(
        "div",
        { className: "dpd-row" },
        h("label", null, t("inspector.radius")),
        numInput(
          sel.props.radius != null ? sel.props.radius : 8,
          (v) => setElProps(sel.id, { radius: v }, "radius:" + sel.id)
        )
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
                onClick: () => setEl(sel.id, { state: s })
              },
              t("stateName." + s)
            )
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
        h(
          "button",
          { className: "dpd-btn", type: "button", onClick: deleteEl },
          h(IconTrash),
          t("inspector.delete")
        )
      )
    );
  } else {
    inspectorBody = h(
      "div",
      null,
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
        )
      )
    );
  }
  const right = h(
    "div",
    { className: "dpd-right" },
    h("div", { className: "dpd-panelTitle" }, h("span", null, t("inspector.title"))),
    inspectorBody
  );
  return h(
    "div",
    { className: "dpd-root", "data-dsh-plugin": "product-design" },
    h(StyleBlock),
    toolbar,
    h("div", { className: "dpd-body" }, left, canvas, right)
  );
}

// src/client/index.js
var inject = ["slots", "layout"];
function apply(ctx) {
  setAppCtx(ctx);
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
  if (typeof ctx.inject === "function") {
    try {
      ctx.inject(["commandUi"], (scope) => {
        scope.effect(
          () => scope.commandUi.register({
            name: "canvas",
            label: () => pickDict(activeLocale(), "command.canvas.label"),
            description: () => pickDict(activeLocale(), "command.canvas.desc"),
            available: () => true,
            ui: {
              kind: "action",
              run: () => {
                try {
                  const layout = ctx.get("layout");
                  if (layout && typeof layout.selectPanel === "function")
                    layout.selectPanel(PANEL_ID);
                } catch (e) {
                }
              }
            }
          }),
          "dsh-product-design: /canvas command"
        );
      });
    } catch (e) {
    }
  }
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
