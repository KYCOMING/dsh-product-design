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
import { applyOps, emptyDoc, summarizeDoc } from './host-model.js';

const API_PREFIX = '/dsh-product-design/api';
const MAX_BODY = 4 * 1024 * 1024;
const HEARTBEAT_MS = 15000;

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
        const push = () => res.write(`data: ${JSON.stringify({ revision: store.snapshot().revision })}\n\n`);
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
    output: { schema: {}, render: renderJson },
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
      'add_element {pageId, type, x?, y?, w?, h?, props?: {text,color,fontSize,fontWeight,radius}, state?} → elementId',
      'update_element {pageId, elementId, x?, y?, w?, h?, state?, props?}; delete_element {pageId, elementId}',
      'set_document_name {name}',
      'Element types: button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.',
      'States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.',
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
    output: { schema: {}, render: renderJson },
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

export function apply(ctx) {
  const store = createStore(docFile());

  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler: makeHandler(ctx, store) }),
    'dsh-product-design: host api',
  );

  registerTools(ctx, store);
}
