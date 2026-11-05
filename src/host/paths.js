/**
 * Filesystem locations for the per-session documents.
 *
 * `<DSH_HOME>/storages/dsh-product-design/sessions/<sessionId>/doc.json`
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

/** Keep session ids usable as one path segment without losing uniqueness. */
function safeSessionId(sessionId) {
  const value = String(sessionId || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  // `.` and `..` survive the character filter but are path segments, not names;
  // letting them through would write outside the sessions directory.
  if (!value || /^\.+$/.test(value)) return 'default';
  return value;
}

function sessionDocFile(sessionId) {
  return join(
    dshHome(),
    'storages',
    'dsh-product-design',
    'sessions',
    safeSessionId(sessionId),
    'doc.json',
  );
}

export { safeSessionId, sessionDocFile };
