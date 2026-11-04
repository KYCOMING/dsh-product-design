import {
  boundsOfEntries,
  cloneElementDeep,
  collectElementEntries,
  descendantIds,
  findDropContainer,
  findElementEntry,
  isContainerType,
  isUnderAny,
  pointInBox,
} from '../shared/elements.js';
import { SNAP_THRESHOLD, snapMoveBox, snapResizeBox } from '../shared/snapping.js';
import { API_PREFIX, defaultState, TYPE_INFO } from './constants.js';
import { useT } from './i18n.js';
import {
  apiFetch,
  defaultDoc,
  loadDoc,
  loadUi,
  makeEl,
  normalizeDoc,
  saveDoc,
  saveUi,
  uid,
} from './model.js';
import { h, useCallback, useEffect, useRef, useState } from './react.js';
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

function reorderInTree(elements, id, toFront) {
  const index = elements.findIndex((el) => el.id === id);
  if (index !== -1) {
    const arr = elements.slice();
    const [el] = arr.splice(index, 1);
    if (toFront) arr.push(el);
    else arr.unshift(el);
    return arr;
  }
  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      const kids = reorderInTree(el.children, id, toFront);
      if (kids !== el.children) {
        const arr = elements.slice();
        arr[i] = { ...el, children: kids };
        return arr;
      }
    }
  }
  return elements;
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

function scaleTree(elements, sx, sy, sf, ox, oy, isRoot) {
  return elements.map((el) => {
    const props = { ...(el.props || {}) };
    if (typeof props.fontSize === 'number')
      props.fontSize = Math.max(8, Math.round(props.fontSize * sf));
    if (typeof props.radius === 'number') props.radius = Math.max(0, Math.round(props.radius * sf));
    const scaled = {
      ...el,
      x: Math.round((isRoot ? el.x - ox : el.x) * sx),
      y: Math.round((isRoot ? el.y - oy : el.y) * sy),
      w: Math.max(12, Math.round(el.w * sx)),
      h: Math.max(8, Math.round(el.h * sy)),
      props,
    };
    if (isContainerType(el.type) && Array.isArray(el.children)) {
      scaled.children = scaleTree(el.children, sx, sy, sf, 0, 0, false);
    }
    return scaled;
  });
}

// ------------------------------------------------------------------
// the panel: state + handlers; UI pieces live under ./ui/*
// ------------------------------------------------------------------
function ProductDesignPanel() {
  const t = useT();
  const [doc, setDocState] = useState(() => loadDoc() || defaultDoc(t));
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
      }
      h.future = [];
    }
    docRef.current = next;
    setDocState(next);
  }, []);
  const [selIds, setSelIds] = useState([]);
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
    saveDoc(doc);
    if (hostRef.current.suppressSave) {
      hostRef.current.suppressSave = false;
      return undefined;
    }
    if (!hostRef.current.on) return undefined;
    const timer = setTimeout(() => {
      apiFetch('/doc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ baseRevision: hostRef.current.revision, doc: doc }),
      }).then((res) => {
        if (!res) return;
        if (res.status === 200 && res.body) {
          hostRef.current.revision = res.body.revision;
        } else if (res.status === 409 && res.body && res.body.doc) {
          const nd = normalizeDoc(res.body.doc);
          if (nd) {
            hostRef.current.revision = res.body.revision;
            hostRef.current.suppressSave = true;
            docRef.current = nd;
            setDocState(nd);
          }
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);

  // Load the Host document on mount and follow its change stream. The panel
  // seeds the Host from the current (localStorage) doc when it is empty.
  useEffect(() => {
    let cancelled = false;
    let source = null;
    (async () => {
      const canStream = typeof window.EventSource === 'function';
      const attempts = canStream ? 6 : 1;
      let got = null;
      for (let i = 0; i < attempts && !cancelled; i += 1) {
        got = await apiFetch('/doc');
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
        const seeded = await apiFetch('/doc', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ baseRevision: hostRef.current.revision, doc: docRef.current }),
        });
        if (seeded && seeded.status === 200 && seeded.body)
          hostRef.current.revision = seeded.body.revision;
      }
      if (cancelled || typeof window.EventSource !== 'function') return;
      try {
        source = new window.EventSource(
          new URL(API_PREFIX + '/events', window.location.href).toString(),
        );
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
          apiFetch('/doc').then((snap) => {
            if (!snap || snap.status !== 200 || !snap.body || !snap.body.doc) return;
            const nd = normalizeDoc(snap.body.doc);
            if (!nd) return;
            hostRef.current.revision = snap.body.revision;
            hostRef.current.suppressSave = true;
            docRef.current = nd;
            setDocState(nd);
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
  }, []);

  useEffect(() => {
    saveUi({
      leftWidth: leftWidth,
      rightWidth: rightWidth,
      rightCollapsed: rightCollapsed,
      section: section,
      snapEnabled: snapEnabled,
    });
  }, [leftWidth, rightWidth, rightCollapsed, section, snapEnabled]);

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
    if (k === 'Escape') {
      if (preview) setPreview(false);
      else setSelIds([]);
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
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, true) })),
    }));
  }
  function sendBack() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: reorderInTree(p.elements, selId, false) })),
    }));
  }
  function resetDoc() {
    if (window.confirm(t('toolbar.resetConfirm'))) {
      setDoc(defaultDoc(t));
      setSelIds([]);
      setPageState('normal');
      setPreview(false);
    }
  }
  /** Bounding box of a page's root elements (empty page → null). */
  function elementsBounds(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const e of elements) {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + e.w);
      maxY = Math.max(maxY, e.y + e.h);
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  function setPreset(key) {
    const map = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const sz = map[key];
    if (!sz) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== d.activePageId) return p;
        const nw = sz[0];
        const nh = sz[1];
        const frame = { ...p.frame, w: nw, h: nh, preset: key };
        const ow = p.frame.w || nw;
        const oh = p.frame.h || nh;
        if (ow === nw && oh === nh) return { ...p, frame };
        const b = elementsBounds(p.elements);
        const hasContent = b && b.w > 0 && b.h > 0;
        // Only heal the legacy "half-width" documents; a page that already
        // uses containers is a deliberate layout and should scale normally.
        const hasContainer = p.elements.some((e) => isContainerType(e.type));
        const inconsistent = !hasContainer && hasContent && b.w >= ow * 0.4 && b.w < ow * 0.8;
        const sx = inconsistent ? nw / b.w : nw / ow;
        const sy = inconsistent ? nh / b.h : nh / oh;
        const ox = inconsistent ? b.minX : 0;
        const oy = inconsistent ? b.minY : 0;
        const sf = Math.min(sx, sy);
        return { ...p, frame, elements: scaleTree(p.elements, sx, sy, sf, ox, oy, true) };
      }),
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
      const entries = collectElementEntries(page.elements).filter((entry) => entry.depth === 0);
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
          setPreview,
          resetDoc,
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
          }),
      h(CanvasView, {
        t,
        doc,
        activePage,
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
      }),
      preview
        ? null
        : h(InspectorView, {
            t,
            sel,
            selCount: selEntries.length,
            activePage,
            setEl,
            setElProps,
            duplicateEl,
            bringFront,
            sendBack,
            deleteEl,
            setPreset,
            renameActivePage,
            patchActiveFrame,
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
    preview
      ? h(
          'button',
          {
            className: 'dpd-previewExit',
            type: 'button',
            title: t('toolbar.exitPreview'),
            onClick: () => setPreview(false),
          },
          t('toolbar.exitPreview'),
        )
      : null,
  );
}

export { ProductDesignPanel };
