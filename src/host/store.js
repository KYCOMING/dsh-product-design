/**
 * In-memory document store with file persistence and change notification.
 *
 * One store per session; the store owns the revision counter used for the
 * optimistic-concurrency check on POST /doc.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyOps, emptyDoc } from './model.js';
import { safeSessionId, sessionDocFile } from './paths.js';

/** Lazily create one store per session. Every request belongs to a session. */
function createStores() {
  const stores = new Map();
  return {
    forSession(sessionId) {
      const key = safeSessionId(sessionId || 'default');
      if (!stores.has(key)) stores.set(key, createStore(sessionDocFile(key)));
      return stores.get(key);
    },
  };
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

export { createStores };
