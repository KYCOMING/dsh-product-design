/**
 * Document state: history, reflow, persistence and Host synchronisation.
 *
 * The Host is authoritative when reachable; otherwise the panel degrades to a
 * localStorage-only document. Remote changes (an agent tool call) arrive over
 * SSE and are recorded as their own undo step.
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
  const hostRef = useRef({ on: false, revision: 0, suppressSave: false });

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
  }

  function adoptRemoteDoc(nd) {
    const prev = docRef.current;
    // Ignore the echo of our own save: SSE can beat the POST response, and the
    // re-fetched document is then byte-for-byte what we already render.
    if (prev && sameDoc(prev, nd)) return;
    // A change that is not a local edit becomes its own undo step.
    if (prev && Date.now() - lastEditRef.current > 800) pushPastSnapshot(prev);
    hostRef.current.suppressSave = true;
    docRef.current = nd;
    setDocState(nd);
    onAdopt(nd);
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
    if (!hostRef.current.on) return undefined;
    const timer = setTimeout(() => {
      apiFetch(
        '/doc',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            baseRevision: hostRef.current.revision,
            doc: doc,
            sessionId: sid,
          }),
        },
        sid,
      ).then((res) => {
        if (!res) return;
        if (res.status === 200 && res.body) {
          hostRef.current.revision = res.body.revision;
        } else if (res.status === 409 && res.body && res.body.doc) {
          const nd = normalizeDoc(res.body.doc);
          if (nd) {
            hostRef.current.revision = res.body.revision;
            adoptRemoteDoc(nd);
          }
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
    hostRef.current = { on: false, revision: 0, suppressSave: true };
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
      hostRef.current.on = true;
      hostRef.current.revision = got.body.revision || 0;
      if (got.body.doc) {
        const nd = normalizeDoc(got.body.doc);
        if (nd) {
          hostRef.current.suppressSave = true;
          docRef.current = nd;
          setDocState(nd);
        }
      } else {
        const seeded = await apiFetch(
          '/doc',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              baseRevision: hostRef.current.revision,
              doc: docRef.current,
              sessionId: sid,
            }),
          },
          sid,
        );
        if (seeded && seeded.status === 200 && seeded.body)
          hostRef.current.revision = seeded.body.revision;
      }
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
          if (
            !data ||
            typeof data.revision !== 'number' ||
            data.revision === hostRef.current.revision
          )
            return;
          apiFetch('/doc', undefined, sid).then((snap) => {
            if (!snap || snap.status !== 200 || !snap.body || !snap.body.doc) return;
            const nd = normalizeDoc(snap.body.doc);
            if (!nd) return;
            hostRef.current.revision = snap.body.revision;
            adoptRemoteDoc(nd);
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
  };
}
