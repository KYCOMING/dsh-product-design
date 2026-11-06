/**
 * Same-origin HTTP surface for the canvas.
 *
 *   GET  /doc     → { revision, doc }
 *   POST /doc     → { baseRevision, doc }  (409 + current document on conflict)
 *   POST /apply   → { operations: [...] }
 *   GET  /events  → SSE, one `{ revision }` per change
 */

import { applySecurityFence } from './http/security.js';
import { streamEvents } from './http/sse.js';

const API_PREFIX = '/dsh-product-design/api';
const MAX_BODY = 16 * 1024 * 1024;

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

      // Same-origin fence (see ./http/security.js).
      if (applySecurityFence(ctx, req, res)) return;

      const sub = pathname.slice(API_PREFIX.length) || '/';
      const querySessionId = url.searchParams.get('sessionId') || '';

      if (sub === '/doc' && req.method === 'GET') {
        writeJson(res, 200, stores.forSession(querySessionId).snapshot());
        return;
      }

      if (sub === '/doc' && req.method === 'POST') {
        const body = await readJson(req);
        const sessionId = body?.sessionId || querySessionId;
        const result = stores
          .forSession(sessionId)
          .setDoc(body?.doc, body?.baseRevision, body?.docId);
        writeJson(res, result.conflict ? 409 : 200, result);
        return;
      }

      if (sub === '/session/doc' && req.method === 'POST') {
        const body = await readJson(req);
        const sessionId = body?.sessionId || querySessionId;
        writeJson(res, 200, stores.forSession(sessionId).selectDoc(body?.docId));
        return;
      }

      if (sub === '/docs' && req.method === 'GET') {
        writeJson(res, 200, stores.listDocs(querySessionId));
        return;
      }

      if (sub === '/docs' && req.method === 'POST') {
        const body = await readJson(req);
        const sessionId = body?.sessionId || querySessionId;
        writeJson(res, 200, stores.createDocFor({ sessionId, name: body?.name, doc: body?.doc }));
        return;
      }

      if (sub === '/docs/duplicate' && req.method === 'POST') {
        const body = await readJson(req);
        const sessionId = body?.sessionId || querySessionId;
        writeJson(res, 200, stores.duplicateDoc(body?.docId, sessionId, body?.name));
        return;
      }

      if (sub === '/docs/rename' && req.method === 'POST') {
        const body = await readJson(req);
        writeJson(
          res,
          200,
          stores.renameDoc(body?.docId, body?.name, body?.sessionId || querySessionId),
        );
        return;
      }

      if (sub === '/docs/delete' && req.method === 'POST') {
        const body = await readJson(req);
        writeJson(res, 200, stores.deleteDoc(body?.docId, body?.sessionId || querySessionId));
        return;
      }

      if (sub === '/docs/export' && req.method === 'GET') {
        const docId = url.searchParams.get('docId') || '';
        const payload = stores.exportDoc(docId, querySessionId);
        const body = JSON.stringify(payload);
        const safeName =
          String(payload.doc?.name || 'design')
            .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5 ]/g, '_')
            .trim()
            .slice(0, 60) || 'design';
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="${safeName}.json"`,
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(body),
        });
        res.end(body);
        return;
      }

      if (sub === '/apply' && req.method === 'POST') {
        const body = await readJson(req);
        const store = stores.forSession(body?.sessionId || querySessionId);
        writeJson(res, 200, store.apply(body?.operations));
        return;
      }

      if (sub === '/events' && req.method === 'GET') {
        streamEvents(stores.forSession(querySessionId), req, res);
        return;
      }

      writeJson(res, 404, { ok: false, error: 'not-found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, message === 'body-too-large' ? 413 : 400, { ok: false, error: message });
    }
  };
}

export { API_PREFIX, makeHandler };
