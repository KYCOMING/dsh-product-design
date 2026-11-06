/** HTTP client for the current document (get / save / switch session / rename). */
import { apiFetch } from '../model.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

export const docApi = {
  get: (sid) => apiFetch('/doc', undefined, sid),
  save: (sid, { baseRevision, docId, doc }) =>
    apiFetch(
      '/doc',
      {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ baseRevision, docId, doc, sessionId: sid }),
      },
      sid,
    ),
  switchSession: (sid, docId) =>
    apiFetch(
      '/session/doc',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sessionId: sid, docId }) },
      sid,
    ),
  rename: (sid, docId, name) =>
    apiFetch(
      '/docs/rename',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ docId, name }) },
      sid,
    ),
};
