import {
  boundsOfEntries,
  cloneElementDeep,
  collectElementEntries,
  descendantIds,
  findDropContainer,
  findElementEntry,
  isContainerType,
  isUnderAny,
  moveElementInTree,
  pointInBox,
  reorderInTree,
  scaleElementsInTree,
} from '../shared/elements.js';
import { SNAP_THRESHOLD, snapMoveBox, snapResizeBox } from '../shared/snapping.js';
import { API_PREFIX, defaultState, TYPE_INFO } from './constants.js';
import { useT } from './i18n.js';
import {
  apiFetch,
  defaultDoc,
  emptyStates,
  loadDoc,
  loadUi,
  makeEl,
  normalizeDoc,
  saveDoc,
  saveUi,
  uid,
} from './model.js';
import { h, useCallback, useEffect, useRef, useState } from './react.js';
import { useSessionId } from './session.js';
import { StyleBlock } from './styles.js';
import { CanvasView } from './ui/canvas.js';
import { InspectorView } from './ui/inspector.js';
import { LeftView } from './ui/left.js';
import { ToolbarView } from './ui/toolbar.js';

// ------------------------------------------------------------------
// immutable element-tree helpers
// ------------------------------------------------------------------
function mapTree(elements, fn) {
  let changed = false;
  const out = elements.map((el) => {
    let next = fn(el);
    if (isContainerType(next.type) && Array.isArray(next.children)) {
      const kids = mapTree(next.children, fn);
      if (kids !== next.children) next = { ...next, children: kids };
    }
    if (next !== el) changed = true;
    return next;
  });
  return changed ? out : elements;
}

function removeFromTree(elements, idSet) {
  let changed = false;
  const out = [];
  for (const el of elements) {
    if (idSet.has(el.id)) {
      changed = true;
      continue;
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = removeFromTree(el.children, idSet);
      if (kids !== el.children) {
        changed = true;
        out.push({ ...el, children: kids });
        continue;
      }
    }
    out.push(el);
  }
  return changed ? out : elements;
}

function extractFromTree(elements, id) {
  let extracted = null;
  let changed = false;
  const walk = (list) => {
    const out = [];
    for (const el of list) {
      if (el.id === id) {
        extracted = el;
        changed = true;
        continue;
      }
      if (isContainerType(el.type) && Array.isArray(el.children)) {
        const kids = walk(el.children);
        if (kids !== el.children) {
          out.push({ ...el, children: kids });
          continue;
        }
      }
      out.push(el);
    }
    return out;
  };
  const next = walk(elements);
  return { elements: changed ? next : elements, extracted };
}

function appendToContainer(elements, containerId, el) {
  let changed = false;
  const out = elements.map((cur) => {
    if (cur.id === containerId) {
      changed = true;
      return { ...cur, children: [...(cur.children || []), el] };
    }
    if (isContainerType(cur.type) && Array.isArray(cur.children)) {
      const kids = appendToContainer(cur.children, containerId, el);
      if (kids !== cur.children) {
        changed = true;
        return { ...cur, children: kids };
      }
    }
    return cur;
  });
  return changed ? out : elements;
}

function replaceInTree(elements, id, updater) {
  let changed = false;
  const out = elements.map((el) => {
    if (el.id === id) {
      changed = true;
      return updater(el);
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = replaceInTree(el.children, id, updater);
      if (kids !== el.children) {
        changed = true;
        return { ...el, children: kids };
      }
    }
    return el;
  });
  return changed ? out : elements;
}

function duplicateInTree(elements, idSet, rootIds) {
  const out = [];
  for (const el of elements) {
    if (idSet.has(el.id)) {
      const copy = cloneElementDeep(el, () => uid());
      copy.x += 16;
      copy.y += 16;
      rootIds.push(copy.id);
      out.push(el, copy);
      continue;
    }
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = duplicateInTree(el.children, idSet, rootIds);
      out.push(kids !== el.children ? { ...el, children: kids } : el);
      continue;
    }
    out.push(el);
  }
  return out;
}

function sameDoc(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------------
// the panel: state + handlers; UI pieces live under ./ui/*
// ------------------------------------------------------------------
function ProductDesignPanel() {
  const t = useT();
  const sessionId = useSessionId();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const [doc, setDocState] = useState(() => loadDoc(sessionId) || defaultDoc(t));
  // Latest doc mirrored in a ref so imperative handlers (drag, keyboard,
  // history) always read the current value instead of a stale closure.
  const docRef = useRef(doc);
  // Undo / redo history. past holds snapshots *before* a change; future
  // holds snapshots for redo. lastKeyRef coalesces rapid same-field edits
  // (typing, arrow nudges) into a single history entry.
  const histRef = useRef({ past: [], future: [] });
  const lastKeyRef = useRef({ key: null, time: 0 });
  const [, bumpHist] = useState(0);
  const HIST_LIMIT = 120;

  // mode: false = don't record; string = coalesce edits with the same key
  // inside ~900ms; anything else = record one history entry.
  const setDoc = useCallback((updater, mode) => {
    const prev = docRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
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
  const [selIds, setSelIds] = useState([]);
  const [hoverId, setHoverId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, value } — inline text editor
  const editingRef = useRef(null);
  editingRef.current = editing;
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y }
  const [layerQuery, setLayerQuery] = useState('');
  const [previewStack, setPreviewStack] = useState([]);
  const [previewOverlay, setPreviewOverlay] = useState(null);
  const clipboardRef = useRef([]);
  const lastEditRef = useRef(0);
  const [preview, setPreview] = useState(false);
  const [pageState, setPageState] = useState('normal');
  const [zoom, setZoom] = useState(1);
  const [ui, setUi] = useState({}); // per-element transient preview state
  const [spaceDown, setSpaceDown] = useState(false); // space held → pan mode
  const spaceRef = useRef(false);
  const [panning, setPanning] = useState(false);
  const [guides, setGuides] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(() => loadUi().snapEnabled !== false);
  const [scaleOnResize, setScaleOnResize] = useState(() => loadUi().scaleOnResize !== false);
  const snapRef = useRef(snapEnabled);
  snapRef.current = snapEnabled;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [leftWidth, setLeftWidth] = useState(() => {
    const w = Number(loadUi().leftWidth);
    return w >= 168 && w <= 460 ? w : 264;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const w = Number(loadUi().rightWidth);
    return w >= 200 && w <= 520 ? w : 242;
  });
  const [rightCollapsed, setRightCollapsed] = useState(() => loadUi().rightCollapsed === true);
  const [section, setSection] = useState(() => {
    const s = loadUi().section;
    return s === null || s === 'pages' || s === 'components' || s === 'layers' ? s : 'pages';
  });

  // Host sync: when the Host half is reachable the document is authoritative
  // there (persisted + shared with agent tools). When it is not, this panel
  // degrades to localStorage-only editing, exactly like before.
  const hostRef = useRef({ on: false, revision: 0, suppressSave: false });

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
    setSelIds([]);
    setPreview(false);
    setPreviewStack([]);
    setPreviewOverlay(null);
    setEditing(null);
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
          } catch (e) {
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
      } catch (e) {
        /* EventSource unavailable */
      }
    })();
    return () => {
      cancelled = true;
      if (source) {
        try {
          source.close();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }, [sessionId]);

  useEffect(() => {
    saveUi({
      leftWidth: leftWidth,
      rightWidth: rightWidth,
      rightCollapsed: rightCollapsed,
      section: section,
      snapEnabled: snapEnabled,
      scaleOnResize: scaleOnResize,
    });
  }, [leftWidth, rightWidth, rightCollapsed, section, snapEnabled, scaleOnResize]);

  const canvasRef = useRef(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const onWheel = (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      const dir = ev.deltaY > 0 ? -1 : 1;
      setZoom((z) => Math.max(0.2, Math.min(2, Math.round((z + dir * 0.1) * 10) / 10)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Hold Space to enter pan mode; released on keyup / window blur.
  useEffect(() => {
    const isEditable = (tgt) => {
      const tag = (tgt && tgt.tagName) || '';
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        tag === 'A' ||
        (tgt && tgt.isContentEditable)
      );
    };
    const down = (e) => {
      if (e.code !== 'Space' || isEditable(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpaceDown(true);
      }
    };
    const up = (e) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    const blur = () => {
      spaceRef.current = false;
      setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Global keyboard shortcuts. Kept in a ref reassigned every render so the
  // handler always closes over the latest state / functions.
  const keyHandlerRef = useRef(null);
  keyHandlerRef.current = (e) => {
    const tgt = e.target;
    const tag = (tgt && tgt.tagName) || '';
    const editable =
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tgt && tgt.isContentEditable);
    if (editable) {
      if (e.key === 'Escape') tgt.blur();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (mod && !e.shiftKey && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && e.shiftKey && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && (k === 'y' || k === 'Y')) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && !e.shiftKey && (k === 'g' || k === 'G')) {
      e.preventDefault();
      groupSelection();
      return;
    }
    if (mod && e.shiftKey && (k === 'g' || k === 'G')) {
      e.preventDefault();
      ungroupSelection();
      return;
    }
    if (mod && (k === 'd' || k === 'D')) {
      e.preventDefault();
      duplicateEl();
      return;
    }
    if (mod && !e.shiftKey && (k === 'c' || k === 'C')) {
      e.preventDefault();
      copySelection();
      return;
    }
    if (mod && !e.shiftKey && (k === 'x' || k === 'X')) {
      e.preventDefault();
      cutSelection();
      return;
    }
    if (mod && !e.shiftKey && (k === 'v' || k === 'V')) {
      e.preventDefault();
      pasteClipboard();
      return;
    }
    if (mod && (k === ']' || k === '}')) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? 'front' : 'forward');
      return;
    }
    if (mod && (k === '[' || k === '{')) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? 'back' : 'backward');
      return;
    }
    if (k === 'Escape') {
      if (editingRef.current) {
        setEditing(null);
        return;
      }
      if (ctxMenu) {
        setCtxMenu(null);
        return;
      }
      if (preview) {
        if (previewOverlay) setPreviewOverlay(null);
        else if (previewStack.length > 1) setPreviewStack((stack) => stack.slice(0, -1));
        else setPreview(false);
      } else {
        setSelIds([]);
      }
      return;
    }
    if (preview) return;
    if (!selIds.length) return;
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      deleteEl();
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0;
      const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
      nudgeSelected(dx, dy);
    }
  };
  useEffect(() => {
    const fn = (e) => keyHandlerRef.current(e);
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Close the context menu on any outside press.
  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  const treeEntries = activePage ? collectElementEntries(activePage.elements) : [];
  const entryById = new Map(treeEntries.map((entry) => [entry.el.id, entry]));
  const selEntries = selIds.map((id) => entryById.get(id)).filter(Boolean);
  const sel = selEntries.length === 1 ? selEntries[0].el : null;
  const selBoxes = selEntries.map((entry) => ({
    id: entry.el.id,
    x: entry.absX,
    y: entry.absY,
    w: entry.w,
    h: entry.h,
  }));
  const multiBounds = selEntries.length > 1 ? boundsOfEntries(selEntries) : null;

  const setActivePage = useCallback(
    (id) => {
      setEditing(null);
      setHoverId(null);
      setSelIds((ids) => {
        const page = docRef.current.pages.find((p) => p.id === id);
        if (!page) return [];
        const kept = ids.filter((item) => !!findElementEntry(page.elements, item));
        return kept.length === ids.length ? ids : kept;
      });
      setDoc((d) => (d.activePageId === id ? d : { ...d, activePageId: id }));
    },
    [setDoc],
  );
  const setUiFor = useCallback((id, patch) => {
    setUi((u) => ({ ...u, [id]: { ...(u[id] || {}), ...patch } }));
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
  function nudgeSelected(dx, dy) {
    if (!selIds.length) return;
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: mapTree(p.elements, (e) =>
            ids.has(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
          ),
        })),
      }),
      'nudge:' + selIds.join(','),
    );
  }
  function pushPastSnapshot(snapshot) {
    const h = histRef.current;
    h.past.push(snapshot);
    if (h.past.length > HIST_LIMIT) h.past.shift();
    h.future = [];
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
    setEditing(null);
    setSelIds((ids) =>
      ids.filter((id) => nd.pages.some((p) => !!findElementEntry(p.elements, id))),
    );
  }

  function mapSelection(fn, mode) {
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: mapTree(p.elements, (el) => (ids.has(el.id) ? fn(el) : el)),
        })),
      }),
      mode,
    );
  }
  function applyAttrs(patch, mode) {
    mapSelection((el) => ({ ...el, ...patch }), mode);
  }
  function applyProps(patch, mode) {
    mapSelection((el) => ({ ...el, props: { ...el.props, ...patch } }), mode);
  }

  function patchPageStates(key, patch) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) =>
          p.id === d.activePageId
            ? {
                ...p,
                states: {
                  ...(p.states || {}),
                  [key]: { ...((p.states || {})[key] || {}), ...patch },
                },
              }
            : p,
        ),
      }),
      'pstate:' + key,
    );
  }

  function copySelection() {
    const entries = topSelectedEntries();
    if (!entries.length) return;
    clipboardRef.current = entries.map((entry) => ({
      el: cloneElementDeep(entry.el),
      absX: entry.absX,
      absY: entry.absY,
    }));
  }
  function cutSelection() {
    copySelection();
    deleteEl();
  }
  function pasteClipboard() {
    const items = clipboardRef.current;
    if (!items || !items.length) return;
    const page = docRef.current.pages.find((p) => p.id === docRef.current.activePageId);
    if (!page) return;
    const targetEntry =
      selEntries.length === 1 && isContainerType(selEntries[0].el.type) ? selEntries[0] : null;
    const newIds = [];
    const copies = items.map((item) => {
      const copy = cloneElementDeep(item.el, () => uid());
      copy.x = Math.round(item.absX + 16 - (targetEntry ? targetEntry.absX : 0));
      copy.y = Math.round(item.absY + 16 - (targetEntry ? targetEntry.absY : 0));
      newIds.push(copy.id);
      return copy;
    });
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== page.id) return p;
        if (!targetEntry) return { ...p, elements: [...p.elements, ...copies] };
        let elements = p.elements;
        for (const copy of copies) elements = appendToContainer(elements, targetEntry.el.id, copy);
        return { ...p, elements };
      }),
    }));
    setSelIds(newIds);
  }

  function reorderSelection(mode) {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        let elements = p.elements;
        for (const id of ids) elements = reorderInTree(elements, id, mode);
        return { ...p, elements };
      }),
    }));
  }

  function moveLayer(id, targetId, position) {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === d.activePageId
          ? { ...p, elements: moveElementInTree(p.elements, id, targetId, position) }
          : p,
      ),
    }));
  }

  function startTextEdit(id, value) {
    setEditing({ id, value });
  }
  function changeText(id, value) {
    setEditing((cur) => (cur && cur.id === id ? { id, value } : cur));
  }
  function commitText() {
    const cur = editingRef.current;
    setEditing(null);
    if (!cur) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({
        ...p,
        elements: replaceInTree(p.elements, cur.id, (el) => ({
          ...el,
          props: { ...el.props, text: cur.value },
        })),
      })),
    }));
  }
  function cancelText() {
    setEditing(null);
  }

  function togglePreview() {
    if (preview) {
      setPreview(false);
      setPreviewStack([]);
      setPreviewOverlay(null);
      return;
    }
    setPreviewStack([docRef.current.activePageId]);
    setPreviewOverlay(null);
    setSelIds([]);
    setEditing(null);
    setPreview(true);
  }

  function interact(el) {
    const link = (el.interactions || [])[0];
    if (!link) return;
    if (link.action === 'back') {
      setPreviewStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
      return;
    }
    const page = docRef.current.pages.find((p) => p.id === link.targetPageId);
    if (!page) return;
    if (link.action === 'openOverlay') setPreviewOverlay(page);
    else {
      setPreviewOverlay(null);
      setPreviewStack((stack) => [...stack, page.id]);
    }
  }

  // ----- document mutations -----
  function addPage() {
    const base = activePage;
    const page = {
      id: uid(),
      name: t('pages.default') + ' ' + (doc.pages.length + 1),
      frame: {
        w: base ? base.frame.w : 390,
        h: base ? base.frame.h : 844,
        preset: base ? base.frame.preset : 'mobile',
        background: '#ffffff',
      },
      states: emptyStates(),
      elements: [],
    };
    setDoc((d) => ({ ...d, pages: [...d.pages, page], activePageId: page.id }));
    setSelIds([]);
  }
  function duplicatePage(id) {
    const src = doc.pages.find((p) => p.id === id);
    if (!src) return;
    const copy = {
      id: uid(),
      name: src.name + ' ' + t('pages.copySuffix'),
      frame: { ...src.frame },
      states: JSON.parse(JSON.stringify(src.states || emptyStates())),
      elements: cloneElementDeep(
        { id: 'root', type: 'group', x: 0, y: 0, w: 0, h: 0, children: src.elements },
        () => uid(),
      ).children,
    };
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.slice();
      pages.splice(idx + 1, 0, copy);
      return { ...d, pages, activePageId: copy.id };
    });
    setSelIds([]);
  }
  function deletePage(id) {
    if (doc.pages.length <= 1) return;
    if (!window.confirm(t('pages.deleteConfirm'))) return;
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.filter((p) => p.id !== id);
      let active = d.activePageId;
      if (active === id) {
        const ni = Math.max(0, Math.min(pages.length - 1, idx - 1));
        active = pages[ni].id;
      }
      return { ...d, pages, activePageId: active };
    });
    setSelIds([]);
  }
  function addElement(type) {
    const target = activePage;
    if (!target) return;
    const info = TYPE_INFO[type];
    if (!info) return;
    const selectedEntry = selIds.length === 1 ? entryById.get(selIds[0]) : null;
    const parentEntry =
      selectedEntry && isContainerType(selectedEntry.el.type) ? selectedEntry : null;
    const parent = parentEntry ? parentEntry.el : null;
    const boundW = parent ? parent.w : target.frame.w;
    const boundH = parent ? parent.h : target.frame.h;
    let w = info.size[0];
    const hh = info.size[1];
    const fullWidth = type === 'navbar' || type === 'tabs';
    if (fullWidth) w = boundW;
    const n = (parent ? parent.children || [] : target.elements).length;
    const x = fullWidth ? 0 : parent ? 16 : 24;
    const y = fullWidth ? Math.min(24 + (n % 6) * 16, Math.max(0, boundH - hh)) : 24 + (n % 8) * 18;
    const props =
      type === 'container'
        ? {
            name: t('comp.container') + ' ' + (n + 1),
            background: '#ffffff',
            radius: 12,
            clipContent: true,
          }
        : {};
    const el = makeEl(
      type,
      Math.max(0, Math.min(x, boundW - w)),
      Math.max(0, Math.min(y, boundH - hh)),
      w,
      hh,
      props,
    );
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== target.id) return p;
        if (!parent) return { ...p, elements: [...p.elements, el] };
        return { ...p, elements: appendToContainer(p.elements, parent.id, el) };
      }),
    }));
    setSelIds([el.id]);
    setPreview(false);
  }
  function duplicateEl() {
    if (!selIds.length) return;
    const ids = new Set(topSelectedEntries().map((entry) => entry.el.id));
    if (!ids.size) return;
    const rootIds = [];
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({
        ...p,
        elements: duplicateInTree(p.elements, ids, rootIds),
      })),
    }));
    if (rootIds.length) setSelIds(rootIds);
  }
  function deleteEl() {
    if (!selIds.length) return;
    const ids = new Set(selIds);
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: removeFromTree(p.elements, ids) })),
    }));
    setSelIds([]);
  }
  function bringFront() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, 'front') })),
    }));
  }
  function sendBack() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, 'back') })),
    }));
  }
  function setPreset(key) {
    const map = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const sz = map[key];
    if (!sz) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        const ow = p.frame.w || sz[0];
        const oh = p.frame.h || sz[1];
        const nw = sz[0];
        const nh = sz[1];
        const elements =
          scaleOnResize && (ow !== nw || oh !== nh)
            ? scaleElementsInTree(p.elements, nw / ow, nh / oh, Math.min(nw / ow, nh / oh))
            : p.elements;
        return { ...p, frame: { ...p.frame, w: nw, h: nh, preset: key }, elements };
      }),
    }));
  }
  function fitContentToFrame() {
    const page = docRef.current.pages.find((p) => p.id === docRef.current.activePageId);
    if (!page || !page.elements.length) return;
    const bounds = boundsOfEntries(collectElementEntries(page.elements));
    if (!bounds || bounds.w <= 0 || bounds.h <= 0) return;
    const sx = page.frame.w / bounds.w;
    const sy = page.frame.h / bounds.h;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              elements: scaleElementsInTree(
                p.elements,
                sx,
                sy,
                Math.min(sx, sy),
                bounds.x,
                bounds.y,
              ),
            }
          : p,
      ),
    }));
  }

  function patchActiveFrame(patch) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) =>
          p.id === d.activePageId ? { ...p, frame: { ...p.frame, ...patch } } : p,
        ),
      }),
      'frame:' + Object.keys(patch).join(','),
    );
  }
  function renameActivePage(name) {
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === d.activePageId ? { ...p, name: name } : p)),
      }),
      'pagename:' + (activePage ? activePage.id : ''),
    );
  }

  // ----- selection + structure -----
  function topSelectedEntries() {
    return selEntries.filter((entry) => !isUnderAny(entry, selIds));
  }

  function groupSelection() {
    const entries = topSelectedEntries();
    if (entries.length < 2) return;
    const list = entries[0].list;
    if (!entries.every((entry) => entry.list === list)) return;
    const bounds = boundsOfEntries(entries);
    if (!bounds) return;
    const parentAbsX = entries[0].absX - entries[0].el.x;
    const parentAbsY = entries[0].absY - entries[0].el.y;
    const group = makeEl(
      'group',
      bounds.x - parentAbsX,
      bounds.y - parentAbsY,
      bounds.w,
      bounds.h,
      { name: t('comp.group') },
    );
    group.children = entries.map((entry) => {
      const copy = cloneElementDeep(entry.el);
      copy.x = entry.absX - bounds.x;
      copy.y = entry.absY - bounds.y;
      return copy;
    });
    const ids = new Set(entries.map((entry) => entry.el.id));
    const insertAt = Math.min(...entries.map((entry) => entry.index));
    const remaining = list.filter((el) => !ids.has(el.id));
    remaining.splice(insertAt, 0, group);
    const parentId = entries[0].parent ? entries[0].parent.id : null;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        if (!parentId) return { ...p, elements: remaining };
        return {
          ...p,
          elements: replaceInTree(p.elements, parentId, (el) => ({ ...el, children: remaining })),
        };
      }),
    }));
    setSelIds([group.id]);
  }

  function ungroupSelection() {
    const entry = selEntries[0];
    if (!entry || entry.el.type !== 'group') return;
    const group = entry.el;
    const kids = (group.children || []).map((child) => {
      const copy = cloneElementDeep(child);
      copy.x += group.x;
      copy.y += group.y;
      return copy;
    });
    const list = entry.list;
    const next = list.slice();
    next.splice(entry.index, 1, ...kids);
    const parentId = entry.parent ? entry.parent.id : null;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        if (!parentId) return { ...p, elements: next };
        return {
          ...p,
          elements: replaceInTree(p.elements, parentId, (el) => ({ ...el, children: next })),
        };
      }),
    }));
    setSelIds(kids.map((k) => k.id));
  }

  function alignSelection(mode) {
    const entries = topSelectedEntries();
    if (!entries.length) return;
    const target =
      entries.length === 1 && activePage
        ? { x: 0, y: 0, w: activePage.frame.w, h: activePage.frame.h }
        : boundsOfEntries(entries);
    if (!target) return;
    const ids = new Set(entries.map((entry) => entry.el.id));
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => {
          if (p.id !== activePage.id) return p;
          return {
            ...p,
            elements: mapTree(p.elements, (el) => {
              if (!ids.has(el.id)) return el;
              const entry = findElementEntry(p.elements, el.id);
              if (!entry) return el;
              const parentAbsX = entry.absX - el.x;
              const parentAbsY = entry.absY - el.y;
              let absX = entry.absX;
              let absY = entry.absY;
              if (mode === 'left') absX = target.x;
              else if (mode === 'centerX') absX = target.x + (target.w - el.w) / 2;
              else if (mode === 'right') absX = target.x + target.w - el.w;
              else if (mode === 'top') absY = target.y;
              else if (mode === 'centerY') absY = target.y + (target.h - el.h) / 2;
              else if (mode === 'bottom') absY = target.y + target.h - el.h;
              return { ...el, x: Math.round(absX - parentAbsX), y: Math.round(absY - parentAbsY) };
            }),
          };
        }),
      }),
      'align:' + mode,
    );
  }

  function distributeSelection(axis) {
    const entries = topSelectedEntries();
    if (entries.length < 3) return;
    const sorted = entries
      .slice()
      .sort((a, b) => (axis === 'x' ? a.absX - b.absX : a.absY - b.absY));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const total = axis === 'x' ? last.absX + last.w - first.absX : last.absY + last.h - first.absY;
    const sum = sorted.reduce((acc, entry) => acc + (axis === 'x' ? entry.w : entry.h), 0);
    const gap = (total - sum) / (sorted.length - 1);
    let cursor = axis === 'x' ? first.absX : first.absY;
    const positions = new Map();
    for (const entry of sorted) {
      positions.set(entry.el.id, cursor);
      cursor += (axis === 'x' ? entry.w : entry.h) + gap;
    }
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== activePage.id) return p;
        return {
          ...p,
          elements: mapTree(p.elements, (el) => {
            if (!positions.has(el.id)) return el;
            const entry = findElementEntry(p.elements, el.id);
            if (!entry) return el;
            const parentAbs = axis === 'x' ? entry.absX - el.x : entry.absY - el.y;
            const pos = Math.round(positions.get(el.id) - parentAbs);
            return axis === 'x' ? { ...el, x: pos } : { ...el, y: pos };
          }),
        };
      }),
    }));
  }

  // ----- drag / resize / snapping -----
  function snapTargets(page, excludeIds) {
    const targets = [{ x: 0, y: 0, w: page.frame.w, h: page.frame.h, id: '__frame__' }];
    for (const entry of collectElementEntries(page.elements)) {
      if (excludeIds.has(entry.el.id)) continue;
      targets.push({
        id: entry.el.id,
        x: entry.absX,
        y: entry.absY,
        w: entry.w,
        h: entry.h,
      });
    }
    return targets;
  }

  function startDrag(ev, pageId, el) {
    if (preview) return;
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const page = docRef.current.pages.find((p) => p.id === pageId);
    if (!page) return;
    if (pageId !== activePage.id) setActivePage(pageId);

    let ids = selIds.slice();
    if (ev.shiftKey) {
      if (ids.includes(el.id)) {
        ids = ids.filter((id) => id !== el.id);
        setSelIds(ids);
        return;
      }
      ids = [...ids, el.id];
    } else if (!ids.includes(el.id) || ids.length > 1) {
      ids = [el.id];
    }
    setSelIds(ids);

    const allEntries = collectElementEntries(page.elements);
    const entries = ids.map((id) => allEntries.find((entry) => entry.el.id === id)).filter(Boolean);
    const top = entries.filter((entry) => !isUnderAny(entry, ids));
    if (!top.length) return;
    const box = boundsOfEntries(top);
    if (!box) return;
    const origins = new Map(top.map((entry) => [entry.el.id, { x: entry.el.x, y: entry.el.y }]));
    const exclude = new Set();
    for (const entry of top) {
      exclude.add(entry.el.id);
      for (const id of descendantIds(entry.el)) exclude.add(id);
    }
    const targets = snapTargets(page, exclude);
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    let moved = false;
    let reparented = false;
    const move = (e2) => {
      const zoomNow = zoomRef.current || 1;
      let dx = Math.round((e2.clientX - sx) / zoomNow);
      let dy = Math.round((e2.clientY - sy) / zoomNow);
      if (snapRef.current) {
        const snapped = snapMoveBox(
          { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h },
          targets,
          SNAP_THRESHOLD / zoomNow,
        );
        dx += snapped.dx;
        dy += snapped.dy;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }
      if (dx !== 0 || dy !== 0) moved = true;
      setDoc(
        (d) => ({
          ...d,
          pages: d.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              elements: mapTree(p.elements, (cur) => {
                const origin = origins.get(cur.id);
                if (!origin) return cur;
                return { ...cur, x: origin.x + dx, y: origin.y + dy };
              }),
            };
          }),
        }),
        false,
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setGuides([]);
      if (top.length === 1) {
        const currentPage = docRef.current.pages.find((p) => p.id === pageId);
        const entry = currentPage ? findElementEntry(currentPage.elements, top[0].el.id) : null;
        if (entry) {
          const cx = entry.absX + entry.w / 2;
          const cy = entry.absY + entry.h / 2;
          const excludeNow = new Set([entry.el.id, ...descendantIds(entry.el)]);
          const target = findDropContainer(
            collectElementEntries(currentPage.elements),
            excludeNow,
            cx,
            cy,
          );
          const parentId = entry.parent ? entry.parent.id : null;
          let nextParent = null;
          if (target && target.el.id !== parentId) nextParent = target.el.id;
          else if (entry.parent) {
            const parentBox = {
              x: entry.absX - entry.el.x,
              y: entry.absY - entry.el.y,
              w: entry.parent.w,
              h: entry.parent.h,
            };
            if (!pointInBox(cx, cy, parentBox)) nextParent = null;
            else nextParent = parentId;
          }
          if (nextParent !== parentId) {
            reparented = reparentElement(entry.el.id, nextParent);
          }
        }
      }
      if ((moved || reparented) && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function reparentElement(elId, containerId) {
    let changed = false;
    setDoc((d) => {
      const page = d.pages.find((p) => p.id === d.activePageId);
      if (!page) return d;
      const entry = findElementEntry(page.elements, elId);
      if (!entry) return d;
      const target = containerId ? findElementEntry(page.elements, containerId) : null;
      if (containerId && (!target || !isContainerType(target.el.type))) return d;
      const absX = entry.absX;
      const absY = entry.absY;
      const targetAbsX = target ? target.absX : 0;
      const targetAbsY = target ? target.absY : 0;
      const extracted = extractFromTree(page.elements, elId);
      if (!extracted.extracted) return d;
      const moved = {
        ...extracted.extracted,
        x: Math.round(absX - targetAbsX),
        y: Math.round(absY - targetAbsY),
      };
      const nextElements = containerId
        ? appendToContainer(extracted.elements, containerId, moved)
        : [...extracted.elements, moved];
      changed = true;
      return {
        ...d,
        pages: d.pages.map((p) => (p.id === page.id ? { ...p, elements: nextElements } : p)),
      };
    }, false);
    return changed;
  }

  function startResize(ev, el, dir) {
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const page = docRef.current.pages.find((p) => p.id === doc.activePageId);
    if (!page) return;
    const entry = findElementEntry(page.elements, el.id);
    if (!entry) return;
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const absX = entry.absX;
    const absY = entry.absY;
    const ow = entry.w;
    const oh = entry.h;
    const parentAbsX = absX - el.x;
    const parentAbsY = absY - el.y;
    const exclude = new Set([el.id, ...descendantIds(el)]);
    const targets = snapTargets(page, exclude);
    let moved = false;
    const move = (e2) => {
      const zoomNow = zoomRef.current || 1;
      const dx = Math.round((e2.clientX - sx) / zoomNow);
      const dy = Math.round((e2.clientY - sy) / zoomNow);
      let next = { x: absX, y: absY, w: ow, h: oh };
      if (dir.indexOf('e') !== -1) next.w = ow + dx;
      if (dir.indexOf('s') !== -1) next.h = oh + dy;
      if (dir.indexOf('w') !== -1) {
        next.x = absX + dx;
        next.w = ow - dx;
      }
      if (dir.indexOf('n') !== -1) {
        next.y = absY + dy;
        next.h = oh - dy;
      }
      if (next.w < 12) {
        if (dir.indexOf('w') !== -1) next.x = absX + ow - 12;
        next.w = 12;
      }
      if (next.h < 8) {
        if (dir.indexOf('n') !== -1) next.y = absY + oh - 8;
        next.h = 8;
      }
      if (snapRef.current) {
        const snapped = snapResizeBox(next, dir, targets, SNAP_THRESHOLD / zoomNow);
        next = snapped.box;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }
      moved = true;
      mapEl(
        el.id,
        (cur) => ({
          ...cur,
          x: Math.round(next.x - parentAbsX),
          y: Math.round(next.y - parentAbsY),
          w: Math.round(next.w),
          h: Math.round(next.h),
        }),
        false,
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setGuides([]);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startMarquee(ev, page) {
    if (preview || ev.button === 1 || spaceRef.current) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (page.id !== activePage.id) setActivePage(page.id);
    const frameEl = ev.currentTarget;
    const rect = frameEl.getBoundingClientRect();
    const zoomNow = zoomRef.current || 1;
    const start = {
      x: (ev.clientX - rect.left) / zoomNow,
      y: (ev.clientY - rect.top) / zoomNow,
    };
    const shift = ev.shiftKey;
    const baseSel = shift ? selIds.slice() : [];
    let moved = false;
    const move = (e2) => {
      const cur = {
        x: (e2.clientX - rect.left) / zoomNow,
        y: (e2.clientY - rect.top) / zoomNow,
      };
      if (Math.abs(cur.x - start.x) > 1 || Math.abs(cur.y - start.y) > 1) moved = true;
      const box = {
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        w: Math.abs(cur.x - start.x),
        h: Math.abs(cur.y - start.y),
      };
      setMarquee({ pageId: page.id, ...box });
      const entries = collectElementEntries(page.elements).filter(
        (entry) => entry.depth === 0 && !entry.el.hidden,
      );
      const ids = entries
        .filter(
          (entry) =>
            entry.absX < box.x + box.w &&
            entry.absX + entry.w > box.x &&
            entry.absY < box.y + box.h &&
            entry.absY + entry.h > box.y,
        )
        .map((entry) => entry.el.id);
      setSelIds(Array.from(new Set([...baseSel, ...ids])));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setMarquee(null);
      if (!moved) setSelIds(shift ? baseSel : []);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  // Pan the canvas by dragging with space held or the middle mouse button.
  function startPan(ev) {
    const el = canvasRef.current;
    if (!el) return;
    ev.preventDefault();
    const sx = ev.clientX;
    const sy = ev.clientY;
    const sl = el.scrollLeft;
    const st = el.scrollTop;
    setPanning(true);
    const move = (e2) => {
      el.scrollLeft = sl - (e2.clientX - sx);
      el.scrollTop = st - (e2.clientY - sy);
    };
    const up = () => {
      setPanning(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startResizeLeft(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const sx = ev.clientX;
    const sw = leftWidth;
    const move = (e2) => {
      const nw = Math.max(168, Math.min(460, Math.round(sw + (e2.clientX - sx))));
      setLeftWidth(nw);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startResizeRight(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (rightCollapsed) return;
    const sx = ev.clientX;
    const sw = rightWidth;
    const move = (e2) => {
      const nw = Math.max(200, Math.min(520, Math.round(sw - (e2.clientX - sx))));
      setRightWidth(nw);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function renderStateFor(el) {
    const base = el.state || defaultState(el.type);
    if (!preview) return base;
    const u = ui[el.id] || {};
    if (el.type === 'button') {
      if (base === 'disabled') return 'disabled';
      if (u.press) return 'active';
      if (u.hover) return 'hover';
      return base;
    }
    if (el.type === 'card') return u.hover ? 'hover' : base;
    if (el.type === 'input') return u.focus ? 'focus' : base;
    return base;
  }
  function activate(el, ev) {
    if (!preview) return;
    const ty = el.type;
    if (ty === 'toggle') setEl(el.id, { state: (el.state || 'on') === 'on' ? 'off' : 'on' });
    else if (ty === 'checkbox')
      setEl(el.id, { state: el.state === 'checked' ? 'unchecked' : 'checked' });
    else if (ty === 'select') setEl(el.id, { state: el.state === 'open' ? 'default' : 'open' });
    else if (ty === 'input') setUiFor(el.id, { focus: true });
    else if (ty === 'tabs') {
      const rect = ev.currentTarget.getBoundingClientRect();
      const count = (el.props.text || t('sample.tabs')).split(',').length || 1;
      const idx = Math.min(
        count - 1,
        Math.max(0, Math.floor(((ev.clientX - rect.left) / rect.width) * count)),
      );
      setUiFor(el.id, { tabs: idx });
    }
  }

  const canUndo = histRef.current.past.length > 0;
  const canRedo = histRef.current.future.length > 0;

  const viewPage = preview
    ? doc.pages.find((p) => p.id === previewStack[previewStack.length - 1]) || activePage
    : activePage;
  const crumbEntry = selEntries[0];
  const breadcrumb = activePage
    ? [
        { id: activePage.id, label: activePage.name },
        ...(crumbEntry
          ? crumbEntry.ancestors.map((id) => {
              const e = entryById.get(id);
              return {
                id,
                label: e ? e.el.name || e.el.props.name || t('comp.' + e.el.type) : id,
              };
            })
          : []),
        ...(crumbEntry
          ? [
              {
                id: crumbEntry.el.id,
                label:
                  crumbEntry.el.name || crumbEntry.el.props.text || t('comp.' + crumbEntry.el.type),
              },
            ]
          : []),
      ]
    : [];
  const ctxEl = selEntries[0] ? selEntries[0].el : null;
  const menuItems = ctxMenu
    ? [
        { label: t('ctx.copy'), key: '⌘C', onClick: copySelection, disabled: !selIds.length },
        { label: t('ctx.cut'), key: '⌘X', onClick: cutSelection, disabled: !selIds.length },
        {
          label: t('ctx.paste'),
          key: '⌘V',
          onClick: pasteClipboard,
          disabled: clipboardRef.current.length === 0,
        },
        { sep: true },
        { label: t('ctx.duplicate'), key: '⌘D', onClick: duplicateEl, disabled: !selIds.length },
        { sep: true },
        {
          label: t('ctx.front'),
          onClick: () => reorderSelection('front'),
          disabled: !selIds.length,
        },
        {
          label: t('ctx.forward'),
          key: '⌘]',
          onClick: () => reorderSelection('forward'),
          disabled: !selIds.length,
        },
        {
          label: t('ctx.backward'),
          key: '⌘[',
          onClick: () => reorderSelection('backward'),
          disabled: !selIds.length,
        },
        { label: t('ctx.back'), onClick: () => reorderSelection('back'), disabled: !selIds.length },
        { sep: true },
        {
          label: t('ctx.group'),
          key: '⌘G',
          onClick: groupSelection,
          disabled: selEntries.length < 2,
        },
        ...(ctxEl && ctxEl.type === 'group'
          ? [{ label: t('ctx.ungroup'), key: '⇧⌘G', onClick: ungroupSelection }]
          : []),
        ...(ctxEl
          ? [
              {
                label: ctxEl.hidden ? t('ctx.show') : t('ctx.hide'),
                onClick: () => setEl(ctxEl.id, { hidden: !ctxEl.hidden }),
              },
              {
                label: ctxEl.locked ? t('ctx.unlock') : t('ctx.lock'),
                onClick: () => setEl(ctxEl.id, { locked: !ctxEl.locked }),
              },
            ]
          : []),
        { sep: true },
        {
          label: t('ctx.delete'),
          key: '⌫',
          onClick: deleteEl,
          danger: true,
          disabled: !selIds.length,
        },
      ]
    : null;

  return h(
    'div',
    {
      className: 'dpd-root' + (preview ? ' dpd-previewMode' : ''),
      'data-dsh-plugin': 'product-design',
    },
    h(StyleBlock),
    preview
      ? null
      : h(ToolbarView, {
          t,
          doc,
          setDoc,
          activePage,
          setPreset,
          pageState,
          setPageState,
          zoom,
          setZoom,
          preview,
          togglePreview,
          undo,
          redo,
          canUndo,
          canRedo,
          setSelId: (id) => setSelIds(id ? [id] : []),
          snapEnabled,
          toggleSnap: () => {
            setSnapEnabled((v) => !v);
            setGuides([]);
          },
        }),
    h(
      'div',
      { className: 'dpd-body' },
      preview
        ? null
        : h(LeftView, {
            t,
            doc,
            activePage,
            setActivePage,
            addPage,
            duplicatePage,
            deletePage,
            addElement,
            section,
            setSection,
            leftWidth,
            startResizeLeft,
            selIds,
            setSelId: (id) => setSelIds(id ? [id] : []),
            setPreview,
            setEl,
            onLayerMove: moveLayer,
            layerQuery,
            setLayerQuery,
          }),
      h(CanvasView, {
        t,
        doc,
        activePage: viewPage,
        zoom,
        selIds,
        selBoxes,
        multiBounds,
        sel,
        preview,
        pageState,
        ui,
        canvasRef,
        spaceRef,
        spaceDown,
        panning,
        guides,
        marquee,
        hoverId,
        editing,
        breadcrumb,
        overlayPage: previewOverlay,
        renderStateFor,
        startDrag,
        startResize,
        startMarquee,
        startPan,
        setSelId: (id) => setSelIds(id ? [id] : []),
        setActivePage,
        setUi,
        setUiFor,
        activate,
        setHoverId,
        onContextMenu: (ev, el) => {
          if (el) {
            if (!selIds.includes(el.id)) setSelIds([el.id]);
          } else {
            setSelIds([]);
          }
          setCtxMenu({ x: ev.clientX, y: ev.clientY });
        },
        onInteract: interact,
        onStartTextEdit: startTextEdit,
        onTextChange: changeText,
        onTextCommit: commitText,
        onTextCancel: cancelText,
        onCloseOverlay: () => setPreviewOverlay(null),
      }),
      preview
        ? null
        : h(InspectorView, {
            t,
            doc,
            sel,
            selCount: selEntries.length,
            activePage,
            pageState,
            scaleOnResize,
            setScaleOnResize,
            fitContentToFrame,
            setEl,
            applyAttrs,
            applyProps,
            duplicateEl,
            bringFront,
            sendBack,
            deleteEl,
            setPreset,
            renameActivePage,
            patchActiveFrame,
            patchPageStates,
            alignSelection,
            distributeSelection,
            groupSelection,
            ungroupSelection,
            rightWidth,
            rightCollapsed,
            toggleRight: () => setRightCollapsed((v) => !v),
            startResizeRight,
          }),
    ),
    preview && previewStack.length > 1
      ? h(
          'div',
          { className: 'dpd-previewNav' },
          h(
            'button',
            {
              type: 'button',
              onClick: () => setPreviewStack((stack) => stack.slice(0, -1)),
            },
            '‹ ' + t('preview.back'),
          ),
        )
      : null,
    preview
      ? h(
          'button',
          {
            className: 'dpd-previewExit',
            type: 'button',
            title: t('toolbar.exitPreview'),
            onClick: () => {
              setPreview(false);
              setPreviewStack([]);
              setPreviewOverlay(null);
            },
          },
          t('toolbar.exitPreview'),
        )
      : null,
    ctxMenu
      ? h(
          'div',
          {
            className: 'dpd-ctxmenu',
            style: {
              left: Math.max(4, Math.min(ctxMenu.x, (window.innerWidth || 1200) - 200)),
              top: Math.max(4, Math.min(ctxMenu.y, (window.innerHeight || 800) - 380)),
            },
            onMouseDown: (e) => e.stopPropagation(),
            onContextMenu: (e) => e.preventDefault(),
          },
          menuItems.map((item, i) =>
            item.sep
              ? h('div', { key: 'sep' + i, className: 'dpd-ctxsep' })
              : h(
                  'button',
                  {
                    key: item.label + i,
                    type: 'button',
                    disabled: item.disabled,
                    className: item.danger ? 'danger' : '',
                    onClick: () => {
                      setCtxMenu(null);
                      item.onClick();
                    },
                  },
                  h('span', null, item.label),
                  item.key ? h('span', { className: 'k' }, item.key) : null,
                ),
          ),
        )
      : null,
  );
}

export { ProductDesignPanel };
