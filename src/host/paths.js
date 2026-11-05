/**
 * Filesystem layout for the design-document library.
 *
 *   <DSH_HOME>/storages/dsh-product-design/docs/<docId>.json
 *   <DSH_HOME>/storages/dsh-product-design/sessions/<sessionId>/active.json
 *
 * A design document is a first-class object; a Session only points at the
 * document it currently shows. That is what lets a draft survive the Session
 * it was created in.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

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

/** Keep an id usable as one path segment without losing uniqueness. */
function safeSegment(value, fallback) {
  const out = String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  // `.` and `..` survive the character filter but are path segments, not names;
  // letting them through would write outside the storage directory.
  if (!out || /^\.+$/.test(out)) return fallback;
  return out;
}

function safeSessionId(sessionId) {
  return safeSegment(sessionId, 'default');
}

function safeDocId(docId) {
  return safeSegment(docId, '');
}

function docsDir() {
  return join(dshHome(), 'storages', 'dsh-product-design', 'docs');
}

function docFile(docId) {
  const id = safeDocId(docId);
  if (!id) throw new Error('invalid-doc-id');
  return join(docsDir(), `${id}.json`);
}

function sessionBindingFile(sessionId) {
  return join(
    dshHome(),
    'storages',
    'dsh-product-design',
    'sessions',
    safeSessionId(sessionId),
    'active.json',
  );
}

export { docFile, docsDir, safeDocId, safeSessionId, sessionBindingFile };
