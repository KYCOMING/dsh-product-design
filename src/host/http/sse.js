/** Server-Sent-Events stream: one `{ revision, docId }` per change + heartbeat. */
const HEARTBEAT_MS = 15000;

export function streamEvents(store, req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  const push = (revision, docId) => res.write(`data: ${JSON.stringify({ revision, docId })}\n\n`);
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
  const snap = store.snapshot();
  push(snap.revision, snap.docId);
}
