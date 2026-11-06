/** Same-origin fence: reuse the Host's connection rejection authority if present. */
export function applySecurityFence(ctx, req, res) {
  try {
    const connection = ctx.get('connection');
    if (connection && typeof connection.requestRejection === 'function') {
      const rejection = connection.requestRejection(req);
      if (rejection) {
        res.writeHead(rejection);
        res.end();
        return true;
      }
    }
  } catch {
    /* no connection service */
  }
  return false;
}
