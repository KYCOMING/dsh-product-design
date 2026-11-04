/**
 * Host half of dsh-product-design — the authoritative document service.
 *
 * The browser canvas is a view: this half owns the design document, persists it
 * under the DSH home, serves it over same-origin HTTP routes (doc + SSE change
 * stream), and exposes agent tools so the model can read and edit the canvas.
 *
 * Routes (prefix `/dsh-product-design/api`):
 *   GET  /doc     → { revision, doc }
 *   POST /doc     → { baseRevision, doc }  (optimistic; 409 + current on conflict)
 *   POST /apply   → { operations: [...] }  (server-side reducer)
 *   GET  /events  → text/event-stream, one `{ revision }` per change
 *
 * Tools (registered globally when the deployment serves a tool registry):
 *   product_design_get_document
 *   product_design_apply
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyOps, emptyDoc, ensureDoc, repairDoc, summarizeDoc } from './model.js';

const API_PREFIX = '/dsh-product-design/api';
const MAX_BODY = 4 * 1024 * 1024;
const HEARTBEAT_MS = 15000;

/** Model-facing guidance so the agent knows the canvas and its tools exist. */
const GUIDANCE = [
  '本机已安装 dsh-product-design 插件：一个「简化版 Figma」产品设计画布，宿主权威。',
  '打开方式：侧边栏「产品设计」图标，或在对话输入框输入 /canvas。',
  '你可以直接用工具读写画布，不需要用户先打开面板：',
  '  product_design_get_document：读取页面/元素/状态。',
  '  product_design_apply：按操作增删改（add_page / add_container / add_element / update_element / delete_element / group_elements / ungroup_elements / set_page_frame / clear_page / set_document_name 等）。',
  '画布坐标原点在每页左上角；默认手机页 390×844。元素类型：container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select。',
  '容器（container）可以嵌套子元素：add_element/add_container 传 containerId 即可放入容器，子元素坐标相对容器左上角；容器支持裁剪内容。',
  'props 常用键：text、color、fontSize、fontWeight、radius；容器还可传 name、background、clipContent。状态见各类型（如 button: default/hover/active/disabled）。',
  '操作里需要页面时可用 pageId，或用 pageId:"@last" / pageIndex（0基）指向同一次 apply 内新建的页面，无需先知道 id。',
  '当用户提出产品设计/原型需求时：先 get_document，再用一次 apply 批量搭好页面与元素，最后提示用户输入 /canvas 或点侧边栏查看。',
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

function docFile() {
  return join(dshHome(), 'storages', 'dsh-product-design', 'doc.json');
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

  // Heal documents left inconsistent by older versions (frame changed without
  // scaling the elements). Persist immediately so reads and the canvas agree.
  const repaired = repairDoc(doc);
  if (repaired.changed) {
    doc = repaired.doc;
    revision += 1;
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ revision, doc }), 'utf8');
    } catch {
      /* best-effort */
    }
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

function makeHandler(ctx, store) {
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

      if (sub === '/doc' && req.method === 'GET') {
        writeJson(res, 200, store.snapshot());
        return;
      }

      if (sub === '/doc' && req.method === 'POST') {
        const body = await readJson(req);
        const result = store.setDoc(body?.doc, body?.baseRevision);
        writeJson(res, result.conflict ? 409 : 200, result);
        return;
      }

      if (sub === '/apply' && req.method === 'POST') {
        const body = await readJson(req);
        const result = store.apply(body?.operations);
        writeJson(res, 200, result);
        return;
      }

      if (sub === '/events' && req.method === 'GET') {
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

function renderJson(_args, value) {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }];
}

function getDocumentTool(store) {
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
      presentationMeta: () => productPreviewMeta(store, []),
    },
    isConcurrencySafe: () => true,
    async execute() {
      const snap = store.snapshot();
      return { ok: true, revision: snap.revision, doc: snap.doc, summary: summarizeDoc(snap.doc) };
    },
  };
}

function applyTool(store) {
  return {
    name: 'product_design_apply',
    description: [
      'Apply an ordered list of operations to the product-design canvas (a simplified Figma). The Host owns the document and broadcasts the result to the open canvas.',
      'Operations (each an object with `kind`):',
      'add_page {name?, preset?: mobile|tablet|desktop, width?, height?, background?} → pageId',
      'delete_page {pageId}; rename_page {pageId, name}; set_page_frame {pageId, preset?|width?, height?, background?}; clear_page {pageId}',
      'add_container {pageId?, containerId?, x?, y?, w?, h?, name?, background?, radius?, clipContent?} → elementId (a frame-like container; pass containerId (or "@last") to nest it)',
      'add_element {pageId?, containerId?, type, x?, y?, w?, h?, props?: {text,color,fontSize,fontWeight,radius}, state?} → elementId (containerId also accepts "@last" for the most recently added container in this apply)',
      'update_element {pageId?, elementId, x?, y?, w?, h?, state?, props?}; delete_element {pageId?, elementId}',
      'group_elements {pageId?, elementIds: string[]} → groupId; ungroup_elements {pageId?, elementId}',
      'set_document_name {name}',
      'Element types: container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.',
      'Container children use coordinates relative to the container; containers clip content by default. States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.',
      'Page targeting: any op that needs a page accepts pageId, or pageId: "@last" for the most recently added page, or pageIndex (0-based). This lets one apply call add a page then place elements on it without knowing its id.',
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
      presentationMeta: (_args, value) => productPreviewMeta(store, value && value.results),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const result = store.apply(args?.operations);
      return {
        ok: result.ok,
        revision: result.revision,
        results: result.results,
        summary: summarizeDoc(result.doc),
      };
    },
  };
}

function registerTools(ctx, store) {
  const install = (scope) => {
    const tools = (scope && scope.tools) || ctx.get('tools');
    if (!tools || typeof tools.register !== 'function') return;
    scope.effect(() => {
      const disposers = [tools.register(getDocumentTool(store)), tools.register(applyTool(store))];
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
  const store = createStore(docFile());

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: API_PREFIX,
        handler: makeHandler(ctx, store),
      }),
    'dsh-product-design: host api',
  );

  registerTools(ctx, store);
  registerPrompt(ctx);
}
