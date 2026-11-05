/**
 * Document state: history, reflow, persistence and Host synchronisation.
 *
 * The Host owns a library of design documents; a Session only points at the
 * document it currently shows. This hook loads the Session's active document,
 * follows its change stream, and exposes `switchDoc` for the document library.
 */

import { reflowDoc } from '../../shared/layout.js';
import { API_PREFIX } from '../constants.js';
import { replaceInTree } from '../domain/tree.js';
import { apiFetch, defaultDoc, loadDoc, normalizeDoc, saveDoc } from '../model.js';
import { useCallback, useEffect, useRef, useState } from '../react.js';

const HIST_LIMIT = 120;

function sameDoc(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useDocument({ sessionId, t, resetTransient, onAdopt }) {
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const [doc, setDocState] = useState(() => loadDoc(sessionId) || defaultDoc(t));
  const [docId, setDocId] = useState('');
  // Latest doc mirrored in a ref so imperative handlers always read the
  // current value instead of a stale closure.
  const docRef = useRef(doc);
  // past holds snapshots *before* a change; future holds snapshots for redo.
  // lastKeyRef coalesces rapid same-field edits into one history entry.
  const histRef = useRef({ past: [], future: [] });
  const lastKeyRef = useRef({ key: null, time: 0 });
  const lastEditRef = useRef(0);
  const [, bumpHist] = useState(0);
  // Host sync state: when reachable the Host owns the document.
  const hostRef = useRef({ on: false, revision: 0, docId: '', suppressSave: false });
  // local = Host unreachable; saving/saved = Host round-trip; conflict = a
  // different writer changed the document while we had unsaved local edits.
  const [syncState, setSyncState] = useState('local');
  const conflictRef = useRef(null);

  function pushPastSnapshot(snapshot) {
    const h = histRef.current;
    h.past.push(snapshot);
    if (h.past.length > HIST_LIMIT) h.past.shift();
    h.future = [];
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
  }

  // mode: false = don't record; string = coalesce edits with the same key
  // inside ~900ms; anything else = record one history entry.
  const setDoc = useCallback((updater, mode) => {
    const prev = docRef.current;
    const raw = typeof updater === 'function' ? updater(prev) : updater;
    const next = reflowDoc(raw);
    if (next === prev) return;
    if (mode !== false) {
      const h = histRef.current;
      let record = true;
      if (typeof mode === 'string') {
        const now = Date.now();
        if (lastKeyRef.current.key === mode && now - lastKeyRef.current.time < 900) record = false;
        lastKeyRef.current = { key: mode, time: now };
      } else {
        lastKeyRef.current = { key: null, time: 0 };
      }
      if (record) {
        pushPastSnapshot(prev);
        lastEditRef.current = Date.now();
      }
      h.future = [];
    }
    docRef.current = next;
    setDocState(next);
    if (hostRef.current.on) setSyncState(conflictRef.current ? 'conflict' : 'saving');
    else setSyncState('local');
  }, []);

  const mapEl = useCallback(
    (elId, fn, mode) => {
      setDoc(
        (d) => ({
          ...d,
          pages: d.pages.map((p) => ({
            ...p,
            elements: replaceInTree(p.elements, elId, fn),
          })),
        }),
        mode,
      );
    },
    [setDoc],
  );
  const setEl = useCallback(
    (elId, patch, mode) => mapEl(elId, (e) => ({ ...e, ...patch }), mode),
    [mapEl],
  );
  const setElProps = useCallback(
    (elId, patch, mode) => mapEl(elId, (e) => ({ ...e, props: { ...e.props, ...patch } }), mode),
    [mapEl],
  );

  function undo() {
    const h = histRef.current;
    if (!h.past.length) return;
    const prev = h.past.pop();
    h.future.push(docRef.current);
    docRef.current = prev;
    setDocState(prev);
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
    if (hostRef.current.on) setSyncState(conflictRef.current ? 'conflict' : 'saving');
    else setSyncState('local');
  }
  function redo() {
    const h = histRef.current;
    if (!h.future.length) return;
    const next = h.future.pop();
    h.past.push(docRef.current);
    if (h.past.length > HIST_LIMIT) h.past.shift();
    docRef.current = next;
    setDocState(next);
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
    if (hostRef.current.on) setSyncState(conflictRef.current ? 'conflict' : 'saving');
    else setSyncState('local');
  }

  /** Render a Host snapshot without treating it as a local edit. */
  function applySnapshot(snap, { resetHistory } = {}) {
    if (!snap || !snap.doc) return false;
    const nd = normalizeDoc(snap.doc);
    if (!nd) return false;
    conflictRef.current = null;
    hostRef.current.on = true;
    hostRef.current.revision = Number(snap.revision) || 0;
    hostRef.current.docId = snap.docId || hostRef.current.docId;
    hostRef.current.suppressSave = true;
    if (resetHistory) {
      histRef.current = { past: [], future: [] };
      bumpHist((v) => v + 1);
    }
    setDocId(hostRef.current.docId);
    docRef.current = nd;
    setDocState(nd);
    onAdopt(nd);
    setSyncState('saved');
    return true;
  }

  function adoptRemoteDoc(nd, nextDocId) {
    // While a conflict is unresolved, keep the local document and only record
    // the newer remote version so the conflict banner can still resolve it.
    if (conflictRef.current) {
      conflictRef.current = {
        ...conflictRef.current,
        remoteDoc: nd,
        remoteRevision: hostRef.current.revision,
        remoteDocId: nextDocId || hostRef.current.docId,
      };
      setSyncState('conflict');
      return;
    }
    const prev = docRef.current;
    // Ignore the echo of our own save: SSE can beat the POST response, and the
    // re-fetched document is then byte-for-byte what we already render.
    if (prev && sameDoc(prev, nd)) return;
    // A change that is not a local edit becomes its own undo step.
    if (prev && Date.now() - lastEditRef.current > 800) pushPastSnapshot(prev);
    hostRef.current.suppressSave = true;
    if (nextDocId) hostRef.current.docId = nextDocId;
    setDocId(hostRef.current.docId);
    docRef.current = nd;
    setDocState(nd);
    onAdopt(nd);
    setSyncState('saved');
  }

  /** Fetch the Session's current document from the Host. */
  async function refreshFromHost(sid) {
    const got = await apiFetch('/doc', undefined, sid);
    if (!got || got.status !== 200 || !got.body) return null;
    const body = got.body;
    hostRef.current.on = true;
    hostRef.current.revision = Number(body.revision) || 0;
    hostRef.current.docId = body.docId || '';
    setDocId(hostRef.current.docId);
    if (body.doc && Array.isArray(body.doc.pages) && body.doc.pages.length > 0) {
      const nd = normalizeDoc(body.doc);
      if (nd) {
        conflictRef.current = null;
        hostRef.current.suppressSave = true;
        docRef.current = nd;
        setDocState(nd);
        onAdopt(nd);
        setSyncState('saved');
      }
      return body;
    }
    // A brand-new document has no pages yet: seed the sample so the canvas is
    // never empty on first open.
    const seeded = defaultDoc(t);
    hostRef.current.suppressSave = true;
    conflictRef.current = null;
    setSyncState('saving');
    docRef.current = seeded;
    setDocState(seeded);
    const res = await apiFetch(
      '/doc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseRevision: hostRef.current.revision,
          docId: hostRef.current.docId,
          doc: seeded,
          sessionId: sid,
        }),
      },
      sid,
    );
    if (res && res.status === 200 && res.body) {
      hostRef.current.revision = res.body.revision;
      setSyncState('saved');
    } else {
      setSyncState(res ? 'offline' : 'local');
    }
    return body;
  }

  /** Switch the Session to another design document. */
  async function switchDoc(nextDocId) {
    const sid = sessionIdRef.current;
    if (!nextDocId || nextDocId === hostRef.current.docId) return false;
    const res = await apiFetch(
      '/session/doc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, docId: nextDocId }),
      },
      sid,
    );
    if (!res || res.status !== 200 || !res.body) return false;
    const ok = applySnapshot(res.body, { resetHistory: true });
    if (ok) resetTransient();
    if (!ok) setSyncState('offline');
    return ok;
  }

  /** Resolve a 409: keep the local document or take the remote one. */
  function resolveConflict(choice) {
    const conflict = conflictRef.current;
    if (!conflict) return;
    conflictRef.current = null;
    hostRef.current.revision = Number(conflict.remoteRevision) || 0;
    if (conflict.remoteDocId) hostRef.current.docId = conflict.remoteDocId;
    if (choice === 'theirs') {
      if (conflict.remoteDoc) {
        applySnapshot(
          {
            revision: conflict.remoteRevision,
            docId: conflict.remoteDocId,
            doc: conflict.remoteDoc,
          },
          { resetHistory: true },
        );
      }
      setSyncState('saved');
      return;
    }
    setSyncState('saving');
    const sid = sessionIdRef.current;
    apiFetch(
      '/doc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseRevision: hostRef.current.revision,
          docId: hostRef.current.docId,
          doc: docRef.current,
          sessionId: sid,
        }),
      },
      sid,
    ).then((res) => {
      if (res && res.status === 200 && res.body) {
        hostRef.current.revision = res.body.revision;
        setSyncState('saved');
        return;
      }
      if (res && res.status === 409 && res.body && res.body.doc) {
        conflictRef.current = {
          remoteDoc: normalizeDoc(res.body.doc),
          remoteRevision: res.body.revision,
          remoteDocId: res.body.docId,
        };
        hostRef.current.revision = res.body.revision;
        setSyncState('conflict');
        return;
      }
      setSyncState(res ? 'offline' : 'local');
    });
  }

  // Host sync: when the Host half is reachable the document is authoritative
  // there (persisted + shared with agent tools). When it is not, this panel
  // degrades to localStorage-only editing, exactly like before.

  useEffect(() => {
    const sid = sessionIdRef.current;
    saveDoc(doc, sid);
    if (hostRef.current.suppressSave) {
      hostRef.current.suppressSave = false;
      return undefined;
    }
    if (!hostRef.current.on) {
      setSyncState('local');
      return undefined;
    }
    if (conflictRef.current) {
      setSyncState('conflict');
      return undefined;
    }
    setSyncState('saving');
    const timer = setTimeout(() => {
      apiFetch(
        '/doc',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            baseRevision: hostRef.current.revision,
            docId: hostRef.current.docId,
            doc: doc,
            sessionId: sid,
          }),
        },
        sid,
      ).then((res) => {
        if (!res) {
          setSyncState('offline');
          return;
        }
        if (res.status === 200 && res.body) {
          hostRef.current.revision = res.body.revision;
          setSyncState('saved');
        } else if (res.status === 409 && res.body && res.body.doc) {
          conflictRef.current = {
            remoteDoc: normalizeDoc(res.body.doc),
            remoteRevision: res.body.revision,
            remoteDocId: res.body.docId,
          };
          hostRef.current.revision = res.body.revision;
          setSyncState('conflict');
        } else {
          setSyncState('offline');
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);

  // Load the Host document for the active Session and follow its change
  // stream. Switching Sessions swaps the whole document; the panel never
  // leaks one Session's canvas into another.
  useEffect(() => {
    let cancelled = false;
    let source = null;
    const sid = sessionId;
    const localDoc = loadDoc(sid) || defaultDoc(t);
    hostRef.current = { on: false, revision: 0, docId: '', suppressSave: true };
    conflictRef.current = null;
    setSyncState('local');
    setDocId('');
    docRef.current = localDoc;
    setDocState(localDoc);
    resetTransient();
    histRef.current = { past: [], future: [] };
    (async () => {
      const canStream = typeof window.EventSource === 'function';
      const attempts = canStream ? 6 : 1;
      let got = null;
      for (let i = 0; i < attempts && !cancelled; i += 1) {
        got = await apiFetch('/doc', undefined, sid);
        if (got && got.status === 200 && got.body) break;
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
      }
      if (cancelled || !got || got.status !== 200 || !got.body) return;
      await refreshFromHost(sid);
      if (cancelled || typeof window.EventSource !== 'function') return;
      try {
        const eventsUrl = new URL(API_PREFIX + '/events', window.location.href);
        if (sid) eventsUrl.searchParams.set('sessionId', sid);
        source = new window.EventSource(eventsUrl.toString());
        source.onmessage = (evt) => {
          let data = null;
          try {
            data = JSON.parse(evt.data);
          } catch {
            data = null;
          }
          if (!data || typeof data.revision !== 'number') return;
          const docChanged = data.docId && data.docId !== hostRef.current.docId;
          if (!docChanged && data.revision === hostRef.current.revision) return;
          apiFetch('/doc', undefined, sid).then((snap) => {
            if (!snap || snap.status !== 200 || !snap.body || !snap.body.doc) return;
            const nextId = snap.body.docId || '';
            if (nextId && nextId !== hostRef.current.docId) {
              hostRef.current.revision = snap.body.revision;
              applySnapshot(snap.body, { resetHistory: true });
              resetTransient();
              return;
            }
            const nd = normalizeDoc(snap.body.doc);
            if (!nd) return;
            hostRef.current.revision = snap.body.revision;
            adoptRemoteDoc(nd, nextId);
          });
        };
      } catch {
        /* EventSource unavailable */
      }
    })();
    return () => {
      cancelled = true;
      if (source) {
        try {
          source.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [sessionId]);

  return {
    doc,
    docId,
    docRef,
    setDoc,
    mapEl,
    setEl,
    setElProps,
    undo,
    redo,
    canUndo: histRef.current.past.length > 0,
    canRedo: histRef.current.future.length > 0,
    pushPastSnapshot,
    adoptRemoteDoc,
    switchDoc,
    refreshFromHost,
    syncState,
    resolveConflict,
  };
}
