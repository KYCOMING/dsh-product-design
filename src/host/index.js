/**
 * Host half of dsh-product-design — the authoritative document service.
 *
 * The browser canvas is a view: this half owns the design document, persists it
 * under the DSH home, serves it over same-origin HTTP routes (doc + SSE change
 * stream), and exposes agent tools so the model can read and edit the canvas.
 *
 * Routes (prefix `/dsh-product-design/api`, optional `?sessionId=`):
 *   GET  /doc     → { revision, doc }
 *   POST /doc     → { baseRevision, doc }  (optimistic; 409 + current on conflict)
 *   POST /apply   → { operations: [...] }  (server-side reducer)
 *   GET  /events  → text/event-stream, one `{ revision }` per change
 *
 * Each conversation owns one document under
 * `storages/dsh-product-design/sessions/<sessionId>/doc.json`. A request
 * without a session id falls back to the `default` session.
 *
 * Tools (registered globally when the deployment serves a tool registry):
 *   product_design_get_document
 *   product_design_apply
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyOps, emptyDoc, ensureDoc, summarizeDoc } from './model.js';

const API_PREFIX = '/dsh-product-design/api';
const MAX_BODY = 4 * 1024 * 1024;
const HEARTBEAT_MS = 15000;

/** Model-facing guidance so the agent knows the canvas and its tools exist. */
const GUIDANCE = [
  '本机已安装 dsh-product-design 插件：一个「简化版 Figma」产品设计画布，宿主权威。',
  '打开方式：侧边栏「产品设计」图标；或直接用 /design <需求> 让 AI 绘制。',
  '每个会话拥有独立设计稿；你可以直接用工具读写当前会话的画布，不需要用户先打开面板：',
  '  product_design_get_document：读取页面/元素/状态。',
  '  product_design_apply：按操作增删改（add_page / duplicate_page / set_active_page / set_page_frame / set_page_states / add_container / add_element / update_element / delete_element / move_element / reorder_element / group_elements / ungroup_elements / clear_page / set_document_name）。',
  '画布坐标原点在每页左上角；默认手机页 390×844。元素类型：container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select。',
  '容器（container）可以嵌套子元素：add_element/add_container 传 containerId 即可放入容器，子元素坐标相对容器左上角；容器支持裁剪内容。move_element 可把元素移到另一个容器。',
  'props 常用键：text、color、fontSize、fontWeight、radius；容器还可传 name、background、clipContent。元素还支持 name（图层名）、hidden、locked、opacity、interactions。',
  'interactions 是原型连线：[{ action: "navigate"|"back"|"openOverlay", targetPageId }]。给按钮加 navigate 就能在预览里走通流程。',
  'constraints 决定画板/容器尺寸变化时元素怎么变：{ h: "left"|"right"|"leftRight"|"center"|"scale", v: "top"|"bottom"|"topBottom"|"center"|"scale" }。默认 left/top；navbar、tabs、card、image、input、container、group 默认左右拉伸。',
  '容器与编组可以开启 Auto Layout：layout { mode: "stack", direction: "row"|"column", gap, padding, align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between" }。开启后子元素的 x/y 由布局接管，顺序即数组顺序。',
  'set_page_frame 默认 resizeMode:"constraints"（按约束重排）；也支持 "scale"（整体缩放）与 "none"（保持不变）。',
  '页面级状态用 set_page_states 写文案：states.loading.text、states.empty.title/desc/action、states.error.title/desc/action。',
  '状态见各类型（如 button: default/hover/active/disabled）。不传 pageId 时默认作用于当前活动页；add_page / duplicate_page 会把新页设为活动页，所以「先 add_page 再 add_element」会自然落在新页。也可用 pageId:"@last" / pageIndex（0基）显式指定。',
  '当用户提出产品设计/原型需求时：先 get_document，再用一次 apply 批量搭好页面与元素；结果会自动出现在对话内的产品预览卡片里，用户也可点侧边栏「产品设计」查看完整画布。',
].join('\n');

export const inject = ['webServer'];

function dshHome() {
  const raw = process.env.DSH_HOME;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const p = raw.trim();
    if (p === '~') return homedir();
    if (p.startsWith('~/')) return join(homedir(), p.slice(2));
    return p;
  }
  return join(homedir(), '.dsh');
}

/** Keep session ids usable as one path segment without losing uniqueness. */
function safeSessionId(sessionId) {
  const value = String(sessionId || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  // `.` and `..` survive the character filter but are path segments, not names;
  // letting them through would write outside the sessions directory.
  if (!value || /^\.+$/.test(value)) return 'default';
  return value;
}

function sessionDocFile(sessionId) {
  return join(
    dshHome(),
    'storages',
    'dsh-product-design',
    'sessions',
    safeSessionId(sessionId),
    'doc.json',
  );
}

/** Lazily create one store per session. Every request belongs to a session. */
function createStores() {
  const stores = new Map();
  return {
    forSession(sessionId) {
      const key = safeSessionId(sessionId || 'default');
      if (!stores.has(key)) stores.set(key, createStore(sessionDocFile(key)));
      return stores.get(key);
    },
  };
}

function createStore(file) {
  let revision = 0;
  let doc = null;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object') {
      revision = Number(parsed.revision) || 0;
      doc = parsed.doc ?? null;
    }
  } catch {
    /* no file yet — start empty */
  }

  const subscribers = new Set();
  function notify() {
    for (const fn of subscribers) {
      try {
        fn(revision);
      } catch {
        /* a broken subscriber must not block others */
      }
    }
  }
  function persist() {
    try {
      mkdirSync(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ revision, doc }), 'utf8');
      renameSync(tmp, file);
    } catch {
      /* persistence is best-effort; the in-memory doc stays authoritative */
    }
  }

  return {
    snapshot() {
      return { revision, doc };
    },
    setDoc(nextDoc, baseRevision) {
      if (typeof baseRevision === 'number' && baseRevision !== revision) {
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
    },
  };
}

function writeJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body-too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid-json'));
      }
    });
    req.on('error', reject);
  });
}

function makeHandler(ctx, stores) {
  return async function handle(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = url.pathname;
      if (!pathname.startsWith(API_PREFIX)) {
        writeJson(res, 404, { ok: false, error: 'not-found' });
        return;
      }

      // Same-origin fence: reuse the Host's own browser-session authority when
      // the deployment provides it; otherwise rely on the loopback bind.
      try {
        const connection = ctx.get('connection');
        if (connection && typeof connection.requestRejection === 'function') {
          const rejection = connection.requestRejection(req);
          if (rejection) {
            res.writeHead(rejection);
            res.end();
            return;
          }
        }
      } catch {
        /* no connection service */
      }

      const sub = pathname.slice(API_PREFIX.length) || '/';
      const querySessionId = url.searchParams.get('sessionId') || '';

      if (sub === '/doc' && req.method === 'GET') {
        writeJson(res, 200, stores.forSession(querySessionId).snapshot());
        return;
      }

      if (sub === '/doc' && req.method === 'POST') {
        const body = await readJson(req);
        const store = stores.forSession(body?.sessionId || querySessionId);
        const result = store.setDoc(body?.doc, body?.baseRevision);
        writeJson(res, result.conflict ? 409 : 200, result);
        return;
      }

      if (sub === '/apply' && req.method === 'POST') {
        const body = await readJson(req);
        const store = stores.forSession(body?.sessionId || querySessionId);
        const result = store.apply(body?.operations);
        writeJson(res, 200, result);
        return;
      }

      if (sub === '/events' && req.method === 'GET') {
        const store = stores.forSession(querySessionId);
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        const push = () =>
          res.write(`data: ${JSON.stringify({ revision: store.snapshot().revision })}\n\n`);
        const unsubscribe = store.subscribe(push);
        const heartbeat = setInterval(() => {
          try {
            res.write(': ping\n\n');
          } catch {
            /* ignore */
          }
        }, HEARTBEAT_MS);
        const close = () => {
          clearInterval(heartbeat);
          unsubscribe();
        };
        req.once('close', close);
        res.once('close', close);
        push();
        return;
      }

      writeJson(res, 404, { ok: false, error: 'not-found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, message === 'body-too-large' ? 413 : 400, { ok: false, error: message });
    }
  };
}

/** Build the inline preview descriptor attached to an apply result. */
function productPreviewMeta(store, results) {
  const snapshot = store.snapshot();
  const doc = ensureDoc(snapshot.doc ?? emptyDoc());
  const pageIds = Array.isArray(results)
    ? results.map((result) => result && result.pageId).filter(Boolean)
    : [];
  let page = null;
  for (let i = pageIds.length - 1; i >= 0 && !page; i -= 1) {
    page = doc.pages.find((candidate) => candidate.id === pageIds[i]) || null;
  }
  if (!page)
    page = doc.pages.find((candidate) => candidate.id === doc.activePageId) || doc.pages[0];
  if (!page) return null;
  const index = doc.pages.findIndex((candidate) => candidate.id === page.id);
  return {
    kind: 'product-design',
    title: page.name || 'Product design',
    pageId: page.id,
    pageIndex: index,
    pageCount: doc.pages.length,
    page: { id: page.id, name: page.name, frame: page.frame, elements: page.elements },
    revision: snapshot.revision,
  };
}

/** Resolve the session whose canvas this tool call edits. */
function sessionIdOf(exec) {
  return (
    exec?.agent?.session?.header?.id ||
    exec?.agent?.session?.id ||
    exec?.agent?.id ||
    exec?.sessionId ||
    ''
  );
}

function renderJson(_args, value) {
  let payload = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const { preview, ...rest } = value;
    payload = rest;
  }
  return [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }];
}

function getDocumentTool(stores) {
  return {
    name: 'product_design_get_document',
    description: [
      'Read the host-authoritative product-design canvas document: its pages, each page frame size, and every element with position/size/state/props.',
      'Call this before editing, and after changes to verify the result. The document may be empty (no pages) on first use.',
    ].join(' '),
    parameters: { type: 'object', properties: {} },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: (_args, value) => (value && value.preview) || null,
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const store = stores.forSession(sessionIdOf(exec));
      const snap = store.snapshot();
      return {
        ok: true,
        revision: snap.revision,
        doc: snap.doc,
        summary: summarizeDoc(snap.doc),
        preview: productPreviewMeta(store, []),
      };
    },
  };
}

function applyTool(stores) {
  return {
    name: 'product_design_apply',
    description: [
      'Apply an ordered list of operations to the product-design canvas (a simplified Figma). The Host owns the document and broadcasts the result to the open canvas.',
      'Operations (each an object with `kind`):',
      'add_page {name?, preset?: mobile|tablet|desktop, width?, height?, background?} → pageId',
      'duplicate_page {pageId, name?} → pageId (copies the whole page with fresh element ids)',
      'delete_page {pageId}; rename_page {pageId, name}; set_active_page {pageId}',
      'set_page_frame {pageId, preset?|width?, height?, background?, resizeMode?: constraints|scale|none} (default constraints); set_page_states {pageId, states: {loading?: {text}, empty?: {title,desc,action}, error?: {title,desc,action}}}',
      'clear_page {pageId}',
      'add_container {pageId?, containerId?, x?, y?, w?, h?, name?, background?, radius?, clipContent?, hidden?, locked?, opacity?, constraints?, layout?} → elementId (a frame-like container; pass containerId (or "@last") to nest it)',
      'add_element {pageId?, containerId?, type, x?, y?, w?, h?, name?, hidden?, locked?, opacity?, state?, props?: {text,color,fontSize,fontWeight,radius}, interactions?} → elementId (containerId also accepts "@last")',
      'update_element {pageId?, elementId, x?, y?, w?, h?, name?, hidden?, locked?, opacity?, state?, props?, interactions?, constraints?, layout?}; delete_element {pageId?, elementId}',
      'move_element {pageId?, elementId, containerId?: string|null, index?} (reparent without moving on screen); reorder_element {pageId?, elementId, position: front|back|forward|backward}',
      'group_elements {pageId?, elementIds: string[]} → groupId; ungroup_elements {pageId?, elementId}',
      'set_document_name {name}',
      'Element types: container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.',
      'Container children use coordinates relative to the container; containers clip content by default. States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.',
      'interactions: [{ action: "navigate"|"back"|"openOverlay", targetPageId }] — wire buttons between pages so the prototype can be walked through in preview.',
      'constraints: { h: "left"|"right"|"leftRight"|"center"|"scale", v: "top"|"bottom"|"topBottom"|"center"|"scale" } control how an element reacts when its parent frame resizes.',
      'layout (containers/groups): { mode: "stack", direction: "row"|"column", gap, padding: {t,r,b,l}|number, align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between" }. Children x/y are owned by the layout; array order is visual order.',
      'Page targeting: any op that needs a page accepts pageId, or pageId: "@last" for the most recently added page, or pageIndex (0-based). Without pageId the op targets the active page; add_page and duplicate_page make the new page active, so add_page followed by add_element lands on the new page.',
      'Returns generated page/element ids and the new revision. Prefer one apply call with several ops over many calls.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of operation objects (see the description for shapes).',
        },
      },
      required: ['operations'],
    },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: (_args, value) => (value && value.preview) || null,
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const store = stores.forSession(sessionIdOf(exec));
      const result = store.apply(args?.operations);
      return {
        ok: result.ok,
        revision: result.revision,
        results: result.results,
        summary: summarizeDoc(result.doc),
        preview: productPreviewMeta(store, result.results),
      };
    },
  };
}

/** A plain user message accepted by Agent.followup(); avoids importing the LLM package. */
function newUserMessage(text) {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  };
}

/** `/design <需求>` — submit a normal user turn that makes the model draw in the canvas. */
function registerDesignCommand(ctx) {
  const install = (scope) => {
    const commands = (scope && scope.commands) || ctx.get('commands');
    if (!commands || typeof commands.register !== 'function') return;
    const register = () =>
      commands.register({
        name: 'design',
        description: '提交产品设计需求，让 AI 在画布上生成或修改设计',
        input: { hint: '<需求>' },
        recordInput: false,
        handler: ({ agent, rawInput }) => {
          const text = String(rawInput || '').trim();
          if (!text) return { kind: 'error', text: '用法：/design <你的产品设计需求>' };
          if (!agent || typeof agent.followup !== 'function') {
            return { kind: 'error', text: '当前会话不支持直接提交需求。' };
          }
          agent.followup(newUserMessage(text));
          return {
            kind: 'success',
            text: '已提交设计需求，AI 会在产品设计画布上开始绘制。',
          };
        },
      });
    if (typeof scope.effect === 'function') {
      scope.effect(register, 'dsh-product-design: /design command');
    } else {
      register();
    }
  };
  if (typeof ctx.inject === 'function') ctx.inject(['commands'], install);
  else install(ctx);
}

function registerTools(ctx, stores) {
  const install = (scope) => {
    const tools = (scope && scope.tools) || ctx.get('tools');
    if (!tools || typeof tools.register !== 'function') return;
    scope.effect(() => {
      const disposers = [
        tools.register(getDocumentTool(stores)),
        tools.register(applyTool(stores)),
      ];
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch {
            /* ignore */
          }
        }
      };
    }, 'dsh-product-design: agent tools');
  };
  if (typeof ctx.inject === 'function') {
    ctx.inject(['tools'], install);
  } else {
    install(ctx);
  }
}

function registerPrompt(ctx) {
  if (typeof ctx.inject !== 'function') return;
  ctx.inject(['systemPrompt', 'tools'], (scope) => {
    const prompt = (scope && scope.systemPrompt) || ctx.get('systemPrompt');
    if (!prompt || typeof prompt.section !== 'function') return;
    scope.effect(
      () => prompt.section({ name: 'plugin:dsh-product-design', order: 160, text: GUIDANCE }),
      'dsh-product-design: prompt section',
    );
  });
}

export function apply(ctx) {
  const stores = createStores();

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: API_PREFIX,
        handler: makeHandler(ctx, stores),
      }),
    'dsh-product-design: host api',
  );

  registerTools(ctx, stores);
  registerDesignCommand(ctx);
  registerPrompt(ctx);
}
