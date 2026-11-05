/**
 * Design-document library + per-Session binding.
 *
 * A document is first-class: it lives in `docs/<docId>.json` and owns its
 * revision counter and subscribers. A Session only stores which document it
 * currently shows (`sessions/<sessionId>/active.json`), so a draft is not tied
 * to the conversation that happened to create it.
 *
 * The store is intentionally file-backed and in-memory: the Host is the only
 * writer, and the browser panel is a view over it.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { applyOps, emptyDoc, ensureDoc } from './model.js';
import { docFile, docsDir, safeDocId, safeSessionId, sessionBindingFile } from './paths.js';

function newDocId() {
  const rnd =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `d${Date.now().toString(36)}${rnd}`;
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, value) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    writeFileSync(tmp, JSON.stringify(value), 'utf8');
    renameSync(tmp, file);
  } catch {
    /* persistence is best-effort; the in-memory document stays authoritative */
  }
}

function metaOf(store, updatedAt) {
  const { doc } = store.snapshot();
  const pages = Array.isArray(doc.pages) ? doc.pages.filter((page) => !page.variantOf) : [];
  return {
    id: store.id,
    name: typeof doc.name === 'string' ? doc.name : '',
    pages: pages.length,
    elements: pages.reduce(
      (total, page) => total + (Array.isArray(page.elements) ? page.elements.length : 0),
      0,
    ),
    updatedAt: updatedAt || Date.now(),
  };
}

function createDocStore(docId, seedDoc) {
  const file = docFile(docId);
  const stored = readJson(file);
  let revision = 0;
  let doc = emptyDoc();
  if (stored && typeof stored === 'object' && stored.doc) {
    revision = Number(stored.revision) || 0;
    doc = ensureDoc(stored.doc);
  } else if (seedDoc) {
    doc = ensureDoc(seedDoc);
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
    writeJson(file, { revision, doc });
  }
  if (!stored) persist();

  return {
    id: docId,
    snapshot() {
      return { revision, doc };
    },
    setDoc(nextDoc, baseRevision) {
      if (typeof baseRevision === 'number' && baseRevision !== revision) {
        return { ok: false, conflict: true, revision, doc };
      }
      revision += 1;
      doc = ensureDoc(nextDoc ?? emptyDoc());
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
    rename(name) {
      doc = { ...doc, name: String(name == null ? '' : name).slice(0, 200) };
      revision += 1;
      persist();
      notify();
      return { revision, doc };
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

/** Create the document library and the Session → document binding index. */
function createStores() {
  const docs = new Map();
  const sessions = new Map();

  function loadDoc(docId) {
    const id = safeDocId(docId);
    if (!id) throw new Error('invalid-doc-id');
    if (!docs.has(id)) {
      if (!existsSync(docFile(id))) throw new Error(`unknown-doc:${id}`);
      docs.set(id, createDocStore(id));
    }
    return docs.get(id);
  }

  function createDoc(seedDoc, name) {
    const id = newDocId();
    const store = createDocStore(id, seedDoc || emptyDoc());
    if (name != null && String(name) !== '') store.rename(name);
    docs.set(id, store);
    return store;
  }

  function sessionState(sessionId) {
    const key = safeSessionId(sessionId || 'default');
    let state = sessions.get(key);
    if (!state) {
      state = { key, docId: '', listeners: new Set(), unsubscribe: null };
      sessions.set(key, state);
    }
    return state;
  }

  function readBinding(state) {
    const data = readJson(sessionBindingFile(state.key));
    return data && typeof data.docId === 'string' ? safeDocId(data.docId) : '';
  }

  function writeBinding(state, docId) {
    writeJson(sessionBindingFile(state.key), { docId });
  }

  function notifySession(state) {
    if (!state.docId) return;
    let revision = 0;
    try {
      revision = loadDoc(state.docId).snapshot().revision;
    } catch {
      return;
    }
    for (const fn of state.listeners) {
      try {
        fn(revision, state.docId);
      } catch {
        /* ignore */
      }
    }
  }

  function attach(state) {
    if (state.unsubscribe) {
      try {
        state.unsubscribe();
      } catch {
        /* ignore */
      }
    }
    state.unsubscribe = null;
    if (!state.docId) return;
    let store;
    try {
      store = loadDoc(state.docId);
    } catch {
      return;
    }
    state.unsubscribe = store.subscribe((revision) => {
      for (const fn of state.listeners) {
        try {
          fn(revision, state.docId);
        } catch {
          /* ignore */
        }
      }
    });
  }

  function ensureSession(sessionId) {
    const state = sessionState(sessionId);
    if (state.docId) return state;
    const bound = readBinding(state);
    if (bound && existsSync(docFile(bound))) {
      state.docId = bound;
    } else {
      const store = createDoc(emptyDoc(), '');
      state.docId = store.id;
      writeBinding(state, store.id);
    }
    attach(state);
    return state;
  }

  function bind(sessionId, docId) {
    const state = sessionState(sessionId);
    const id = safeDocId(docId);
    if (!id) throw new Error('invalid-doc-id');
    loadDoc(id);
    if (state.docId === id) return state;
    state.docId = id;
    writeBinding(state, id);
    attach(state);
    notifySession(state);
    return state;
  }

  function snapshotOf(state) {
    const store = loadDoc(state.docId);
    const snap = store.snapshot();
    return { docId: state.docId, revision: snap.revision, doc: snap.doc };
  }

  function forSession(sessionId) {
    const state = ensureSession(sessionId);
    return {
      docId: state.docId,
      snapshot() {
        return snapshotOf(state);
      },
      setDoc(nextDoc, baseRevision, docId) {
        if (docId && safeDocId(docId) !== state.docId) {
          return { ok: false, conflict: true, ...snapshotOf(state) };
        }
        return { ...loadDoc(state.docId).setDoc(nextDoc, baseRevision), docId: state.docId };
      },
      apply(operations) {
        return { ...loadDoc(state.docId).apply(operations), docId: state.docId };
      },
      subscribe(fn) {
        state.listeners.add(fn);
        return () => state.listeners.delete(fn);
      },
      selectDoc(docId) {
        bind(state.key, docId);
        return snapshotOf(state);
      },
    };
  }

  function listDocs(sessionId) {
    const active = ensureSession(sessionId).docId;
    const dir = docsDir();
    let files = [];
    try {
      files = readdirSync(dir).filter((name) => name.endsWith('.json'));
    } catch {
      files = [];
    }
    const out = [];
    for (const file of files) {
      const data = readJson(join(dir, file));
      if (!data || typeof data !== 'object' || !data.doc) continue;
      const id = file.slice(0, -5);
      const doc = data.doc;
      const pages = Array.isArray(doc.pages) ? doc.pages.filter((page) => !page.variantOf) : [];
      let updatedAt = 0;
      try {
        updatedAt = statSync(join(dir, file)).mtimeMs;
      } catch {
        updatedAt = 0;
      }
      out.push({
        id,
        name: typeof doc.name === 'string' ? doc.name : '',
        pages: pages.length,
        elements: pages.reduce(
          (total, page) => total + (Array.isArray(page.elements) ? page.elements.length : 0),
          0,
        ),
        updatedAt,
      });
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return { docs: out, activeDocId: active };
  }

  function createDocFor({ sessionId, name, doc }) {
    const store = createDoc(doc || emptyDoc(), name);
    if (sessionId) bind(sessionId, store.id);
    return { meta: metaOf(store), snapshot: sessionId ? forSession(sessionId).snapshot() : null };
  }

  function duplicateDoc(docId, name) {
    const source = loadDoc(docId).snapshot().doc;
    const copy = clone(source);
    copy.name = name != null ? String(name) : source.name ? `${source.name} copy` : '';
    const store = createDoc(copy);
    return metaOf(store);
  }

  function renameDoc(docId, name) {
    const store = loadDoc(docId);
    store.rename(name);
    return metaOf(store);
  }

  function deleteDoc(docId) {
    const id = safeDocId(docId);
    loadDoc(id);
    try {
      unlinkSync(docFile(id));
    } catch {
      /* already gone */
    }
    docs.delete(id);
    const rebinds = [];
    for (const state of sessions.values()) {
      if (state.docId !== id) continue;
      const store = createDoc(emptyDoc(), '');
      state.docId = store.id;
      writeBinding(state, store.id);
      attach(state);
      notifySession(state);
      rebinds.push({ sessionId: state.key, docId: store.id });
    }
    return { ok: true, rebinds };
  }

  function importDoc(payload, name) {
    const raw = payload && typeof payload === 'object' && payload.doc ? payload.doc : payload;
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pages)) {
      throw new Error('invalid-import');
    }
    const doc = ensureDoc(raw);
    if (name != null) doc.name = String(name).slice(0, 200);
    const store = createDoc(doc);
    return metaOf(store);
  }

  function exportDoc(docId) {
    const snap = loadDoc(docId).snapshot();
    return {
      format: 'dsh-product-design',
      version: 1,
      exportedAt: new Date().toISOString(),
      doc: snap.doc,
    };
  }

  return {
    createDocFor,
    deleteDoc,
    duplicateDoc,
    exportDoc,
    forSession,
    importDoc,
    listDocs,
    renameDoc,
  };
}

export { createStores };
