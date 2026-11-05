/**
 * Same-origin HTTP surface for the canvas.
 *
 *   GET  /doc     → { revision, doc }
 *   POST /doc     → { baseRevision, doc }  (409 + current document on conflict)
 *   POST /apply   → { operations: [...] }
 *   GET  /events  → SSE, one `{ revision }` per change
 */

const API_PREFIX = '/dsh-product-design/api';
const MAX_BODY = 4 * 1024 * 1024;
const HEARTBEAT_MS = 15000;

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

export { API_PREFIX, makeHandler };
