/**
 * Single-document store + file-persistence helpers.
 *
 * Extracted from `store.js` so the document library / session-binding logic and
 * the per-document revision + persistence logic live in separate modules.
 *
 *   docs/<docId>.json  ← one file per document, owned by this store
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyOps, emptyDoc, ensureDoc } from './model.js';
import { docFile } from './paths.js';

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
  } catch (error) {
    // Persistence is best-effort (the in-memory document stays authoritative),
    // but a silent failure hides data loss — log it so it can be diagnosed.
    console.warn(
      '[dsh-product-design] failed to persist',
      file,
      error instanceof Error ? error.message : error,
    );
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

function createDocStore(docId, seedDoc, owner) {
  const file = docFile(docId);
  const stored = readJson(file);
  let revision = 0;
  let doc = emptyDoc();
  // `ownerId` is the Session that owns this draft (a Session has many drafts).
  // Legacy files written before ownership existed carry no owner and are
  // adopted lazily by the Session that is bound to them (see listDocs).
  let ownerId = owner == null ? '' : String(owner);
  if (stored && typeof stored === 'object' && stored.doc) {
    revision = Number(stored.revision) || 0;
    doc = ensureDoc(stored.doc);
    if (stored.owner != null) ownerId = String(stored.owner);
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
    writeJson(file, { revision, doc, owner: ownerId });
  }
  if (!stored) persist();

  return {
    id: docId,
    owner() {
      return ownerId;
    },
    setOwner(next) {
      const value = next == null ? '' : String(next);
      if (value === ownerId) return;
      ownerId = value;
      persist();
    },
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

export { clone, createDocStore, metaOf, readJson, writeJson };
