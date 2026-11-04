// src/host/index.js
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// src/host/model.js
var ELEMENT_TYPES = {
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
function scaleProps(props, s) {
  const out = isObj(props) ? { ...props } : {};
  if (typeof out.fontSize === "number") out.fontSize = Math.max(8, Math.round(out.fontSize * s));
  if (typeof out.radius === "number") out.radius = Math.max(0, Math.round(out.radius * s));
  return out;
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
  return {
    id: str(e.id, "") || newId("e"),
    type,
    x: num(e.x, 0),
    y: num(e.y, 0),
    w: Math.max(12, num(e.w, dw)),
    h: Math.max(8, num(e.h, dh)),
    state,
    props
  };
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
function applyOne(doc, op, index) {
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
      const s = Math.min(nw / ow, nh / oh);
      page.elements = page.elements.map((e) => ({
        ...e,
        x: Math.round(e.x * s),
        y: Math.round(e.y * s),
        w: Math.max(12, Math.round(e.w * s)),
        h: Math.max(8, Math.round(e.h * s)),
        props: scaleProps(e.props, s)
      }));
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
    const [dw, dh] = ELEMENT_TYPES[type];
    const fullWidth = type === "navbar" || type === "tabs";
    const w = Math.max(12, num(op.w, fullWidth ? page.frame.w : dw));
    const n = page.elements.length;
    const el = ensureElement({
      id: newId("e"),
      type,
      x: num(op.x, fullWidth ? 0 : 24),
      y: num(op.y, 24 + n % 10 * 18),
      w,
      h: Math.max(8, num(op.h, dh)),
      state: op.state,
      props: op.props
    });
    page.elements.push(el);
    return { op: index, kind, pageId: page.id, elementId: el.id, type };
  }
  if (kind === "update_element") {
    const page = findPage(doc, op, index);
    const el = page.elements.find((e) => e.id === op.elementId);
    if (!el) throw new Error(`op[${index}] update_element: unknown element "${op.elementId}"`);
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
    const before = page.elements.length;
    page.elements = page.elements.filter((e) => e.id !== op.elementId);
    if (page.elements.length === before)
      throw new Error(`op[${index}] delete_element: unknown element "${op.elementId}"`);
    return { op: index, kind, pageId: page.id, elementId: op.elementId };
  }
  throw new Error(`op[${index}] has unknown kind "${kind}"`);
}
function applyOps(rawDoc, ops) {
  if (!Array.isArray(ops)) throw new Error("operations must be an array");
  if (ops.length === 0) throw new Error("operations must not be empty");
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  const results = ops.map((op, i) => applyOne(doc, op, i));
  if (!doc.activePageId && doc.pages.length) doc.activePageId = doc.pages[0].id;
  return { doc, results };
}
function summarizeDoc(rawDoc) {
  const doc = ensureDoc(rawDoc ?? emptyDoc());
  return {
    name: doc.name,
    activePageId: doc.activePageId,
    pages: doc.pages.map((p) => ({
      id: p.id,
      name: p.name,
      frame: `${p.frame.w}\xD7${p.frame.h}`,
      elements: p.elements.length
    }))
  };
}

// src/host/index.js
var API_PREFIX = "/dsh-product-design/api";
var MAX_BODY = 4 * 1024 * 1024;
var HEARTBEAT_MS = 15e3;
var GUIDANCE = [
  "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-product-design \u63D2\u4EF6\uFF1A\u4E00\u4E2A\u300C\u7B80\u5316\u7248 Figma\u300D\u4EA7\u54C1\u8BBE\u8BA1\u753B\u5E03\uFF0C\u5BBF\u4E3B\u6743\u5A01\u3002",
  "\u6253\u5F00\u65B9\u5F0F\uFF1A\u4FA7\u8FB9\u680F\u300C\u4EA7\u54C1\u8BBE\u8BA1\u300D\u56FE\u6807\uFF0C\u6216\u5728\u5BF9\u8BDD\u8F93\u5165\u6846\u8F93\u5165 /canvas\u3002",
  "\u4F60\u53EF\u4EE5\u76F4\u63A5\u7528\u5DE5\u5177\u8BFB\u5199\u753B\u5E03\uFF0C\u4E0D\u9700\u8981\u7528\u6237\u5148\u6253\u5F00\u9762\u677F\uFF1A",
  "  product_design_get_document\uFF1A\u8BFB\u53D6\u9875\u9762/\u5143\u7D20/\u72B6\u6001\u3002",
  "  product_design_apply\uFF1A\u6309\u64CD\u4F5C\u589E\u5220\u6539\uFF08add_page / add_element / update_element / delete_element / set_page_frame / clear_page / set_document_name \u7B49\uFF09\u3002",
  "\u753B\u5E03\u5750\u6807\u539F\u70B9\u5728\u6BCF\u9875\u5DE6\u4E0A\u89D2\uFF1B\u9ED8\u8BA4\u624B\u673A\u9875 390\xD7844\u3002\u5143\u7D20\u7C7B\u578B\uFF1Abutton, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select\u3002",
  "props \u5E38\u7528\u952E\uFF1Atext\u3001color\u3001fontSize\u3001fontWeight\u3001radius\uFF1B\u72B6\u6001\u89C1\u5404\u7C7B\u578B\uFF08\u5982 button: default/hover/active/disabled\uFF09\u3002",
  '\u64CD\u4F5C\u91CC\u9700\u8981\u9875\u9762\u65F6\u53EF\u7528 pageId\uFF0C\u6216\u7528 pageId:"@last" / pageIndex\uFF080\u57FA\uFF09\u6307\u5411\u540C\u4E00\u6B21 apply \u5185\u65B0\u5EFA\u7684\u9875\u9762\uFF0C\u65E0\u9700\u5148\u77E5\u9053 id\u3002',
  "\u5F53\u7528\u6237\u63D0\u51FA\u4EA7\u54C1\u8BBE\u8BA1/\u539F\u578B\u9700\u6C42\u65F6\uFF1A\u5148 get_document\uFF0C\u518D\u7528\u4E00\u6B21 apply \u6279\u91CF\u642D\u597D\u9875\u9762\u4E0E\u5143\u7D20\uFF0C\u6700\u540E\u63D0\u793A\u7528\u6237\u8F93\u5165 /canvas \u6216\u70B9\u4FA7\u8FB9\u680F\u67E5\u770B\u3002"
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
    output: { schema: {}, render: renderJson },
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
      "add_element {pageId, type, x?, y?, w?, h?, props?: {text,color,fontSize,fontWeight,radius}, state?} \u2192 elementId",
      "update_element {pageId, elementId, x?, y?, w?, h?, state?, props?}; delete_element {pageId, elementId}",
      "set_document_name {name}",
      "Element types: button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.",
      "States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.",
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
    output: { schema: {}, render: renderJson },
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
  registerPrompt(ctx);
}
export {
  apply,
  inject
};
