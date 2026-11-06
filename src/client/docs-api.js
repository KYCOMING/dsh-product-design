/**
 * Pure HTTP client for the design-document library. Keeps request shaping out of
 * the useDocs state machine (see docs.js); every call returns the raw
 * `{ status, body } | null` from apiFetch.
 */

import { downloadText, safeFileName } from './export/index.js';
import { apiFetch } from './model.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

export const docsApi = {
  list: (sessionId) => apiFetch('/docs', undefined, sessionId),
  create: (sessionId, doc) =>
    apiFetch(
      '/docs',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sessionId, doc }) },
      sessionId,
    ),
  duplicate: (sessionId, docId) =>
    apiFetch(
      '/docs/duplicate',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ docId, sessionId }) },
      sessionId,
    ),
  rename: (sessionId, docId, name) =>
    apiFetch(
      '/docs/rename',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ docId, name }) },
      sessionId,
    ),
  remove: (sessionId, docId) =>
    apiFetch(
      '/docs/delete',
      { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ docId }) },
      sessionId,
    ),
  export: (sessionId, docId) =>
    apiFetch('/docs/export?docId=' + encodeURIComponent(docId), undefined, sessionId),
};

/** Trigger a JSON file download for an exported document payload. */
export function saveExportedDoc(body) {
  const name = body.doc && body.doc.name ? body.doc.name : 'design';
  downloadText(
    JSON.stringify(body, null, 2),
    `${safeFileName(name, 'design')}.json`,
    'application/json;charset=utf-8',
  );
}
