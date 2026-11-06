/** Host document API client (returns null when the Host is unreachable). */
import { API_PREFIX } from '../constants.js';

/**
 * Call the Host document API. Returns `{ status, body }`, or `null` when the
 * Host half is not reachable (standalone/localStorage-only mode).
 */
function apiFetch(path, init, sessionId) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  let target = API_PREFIX + path;
  if (sessionId) {
    target += (target.includes('?') ? '&' : '?') + 'sessionId=' + encodeURIComponent(sessionId);
  }
  let url;
  try {
    url = new URL(
      target,
      window.location && window.location.href ? window.location.href : 'http://localhost/',
    ).toString();
  } catch {
    return Promise.resolve(null);
  }
  const opts = Object.assign({}, init);
  if (
    !opts.signal &&
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    try {
      opts.signal = AbortSignal.timeout(4000);
    } catch {
      /* ignore */
    }
  }
  return fetch(url, opts).then(
    (res) =>
      res.text().then((text) => {
        let body = null;
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }
        }
        return { status: res.status, body };
      }),
    () => null,
  );
}

export { apiFetch };
