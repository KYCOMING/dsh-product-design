import { ACCENT, API_PREFIX, defaultState, LIB_ORDER, TYPE_INFO } from './constants.js';
import { useT } from './i18n.js';
import {
  IconBack,
  IconComponents,
  IconCopy,
  IconEye,
  IconFront,
  IconLayers,
  IconMinus,
  IconPages,
  IconPencil,
  IconPlus,
  IconRedo,
  IconReset,
  IconTrash,
  IconUndo,
  libGlyph,
  Svg,
} from './icons.js';
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
import { PageOverlay } from './overlay.js';
import { h, useCallback, useEffect, useRef, useState } from './react.js';
import { StyleBlock } from './styles.js';
import { renderWidget } from './widgets.js';

// ------------------------------------------------------------------
// the panel
// ------------------------------------------------------------------
const GAP = 72;
const LABEL = 30;

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
  const [selId, setSelId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [pageState, setPageState] = useState('normal');
  const [zoom, setZoom] = useState(1);
  const [ui, setUi] = useState({}); // per-element transient preview state
  const [spaceDown, setSpaceDown] = useState(false); // space held → pan mode
  const spaceRef = useRef(false);
  const [panning, setPanning] = useState(false);
  const [leftWidth, setLeftWidth] = useState(() => {
    const w = Number(loadUi().leftWidth);
    return w >= 168 && w <= 460 ? w : 264;
  });
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
      // The host API should be up by the time the browser loads, but a
      // slower boot should not permanently disable sync: retry a few times
      // when this looks like a real browser (EventSource present).
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
    saveUi({ leftWidth: leftWidth, section: section });
  }, [leftWidth, section]);

  const canvasRef = useRef(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    // Ctrl/Cmd + wheel (and trackpad pinch, which browsers report as a
    // ctrlKey wheel) zooms the canvas; a plain wheel keeps scrolling.
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
    if (mod && (k === 'd' || k === 'D')) {
      e.preventDefault();
      duplicateEl();
      return;
    }
    if (k === 'Escape') {
      if (preview) setPreview(false);
      else setSelId(null);
      return;
    }
    if (preview) return;
    if (!selId) return;
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

  const setActivePage = useCallback((id) => setDoc((d) => ({ ...d, activePageId: id })), []);
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
            elements: p.elements.map((e) => (e.id === elId ? fn(e) : e)),
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
    if (!selId) return;
    setDoc(
      (d) => ({
        ...d,
        pages: d.pages.map((p) => ({
          ...p,
          elements: p.elements.map((e) =>
            e.id === selId ? { ...e, x: e.x + dx, y: e.y + dy } : e,
          ),
        })),
      }),
      'nudge:' + selId,
    );
  }
  // Record a single pre-change snapshot (used by drag / resize on mouse-up).
  function pushPastSnapshot(snapshot) {
    const h = histRef.current;
    h.past.push(snapshot);
    if (h.past.length > HIST_LIMIT) h.past.shift();
    h.future = [];
    lastKeyRef.current = { key: null, time: 0 };
    bumpHist((v) => v + 1);
  }

  let sel = null;
  let selPage = null;
  if (selId) {
    for (const p of doc.pages) {
      const e = p.elements.find((x) => x.id === selId);
      if (e) {
        sel = e;
        selPage = p;
        break;
      }
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
      elements: [],
    };
    setDoc((d) => ({ ...d, pages: [...d.pages, page], activePageId: page.id }));
  }
  function duplicatePage(id) {
    const src = doc.pages.find((p) => p.id === id);
    if (!src) return;
    const copy = {
      id: uid(),
      name: src.name + ' ' + t('pages.copySuffix'),
      frame: { ...src.frame },
      elements: src.elements.map((e) => ({ ...e, id: uid(), props: { ...e.props } })),
    };
    setDoc((d) => {
      const idx = d.pages.findIndex((p) => p.id === id);
      const pages = d.pages.slice();
      pages.splice(idx + 1, 0, copy);
      return { ...d, pages, activePageId: copy.id };
    });
  }
  function deletePage(id) {
    if (doc.pages.length <= 1) return;
    if (!window.confirm(t('pages.deleteConfirm'))) return;
    const removing = doc.pages.find((p) => p.id === id);
    if (removing && selId && removing.elements.some((e) => e.id === selId)) setSelId(null);
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
  }
  function addElement(type) {
    const target = activePage;
    if (!target) return;
    const info = TYPE_INFO[type];
    let w = info.size[0];
    const hh = info.size[1];
    const fullWidth = type === 'navbar' || type === 'tabs';
    if (fullWidth) w = target.frame.w;
    const n = target.elements.length;
    const x = fullWidth ? 0 : 24;
    const y = fullWidth ? Math.min(24 + (n % 6) * 16, target.frame.h - hh) : 24 + (n % 8) * 18;
    const el = makeEl(
      type,
      Math.max(0, Math.min(x, target.frame.w - w)),
      Math.max(0, Math.min(y, target.frame.h - hh)),
      w,
      hh,
    );
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === target.id ? { ...p, elements: [...p.elements, el] } : p)),
    }));
    setSelId(el.id);
    setPreview(false);
  }
  function duplicateEl() {
    if (!sel || !selPage) return;
    const c = { ...sel, id: uid(), x: sel.x + 16, y: sel.y + 16, props: { ...sel.props } };
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === selPage.id ? { ...p, elements: [...p.elements, c] } : p)),
    }));
    setSelId(c.id);
  }
  function deleteEl() {
    if (!selId) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== selId) })),
    }));
    setSelId(null);
  }
  function bringFront() {
    if (!sel || !selPage) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === selPage.id
          ? { ...p, elements: [...p.elements.filter((e) => e.id !== selId), sel] }
          : p,
      ),
    }));
  }
  function sendBack() {
    if (!sel || !selPage) return;
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === selPage.id
          ? { ...p, elements: [sel, ...p.elements.filter((e) => e.id !== selId)] }
          : p,
      ),
    }));
  }
  function resetDoc() {
    if (window.confirm(t('toolbar.resetConfirm'))) {
      setDoc(defaultDoc(t));
      setSelId(null);
      setPageState('normal');
      setPreview(false);
    }
  }
  function setPreset(key) {
    const map = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const sz = map[key];
    if (!sz) return;
    // Changing the frame size scales the page's components with it (uniform
    // fit: min of the width/height ratios), so a desktop layout does not
    // spill out when previewed at phone size, and vice versa. Font size and
    // radius follow the same factor to keep proportions.
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
        const s = Math.min(nw / ow, nh / oh);
        const scaleEl = (e) => {
          const props = { ...e.props };
          if (typeof props.fontSize === 'number')
            props.fontSize = Math.max(8, Math.round(props.fontSize * s));
          if (typeof props.radius === 'number')
            props.radius = Math.max(0, Math.round(props.radius * s));
          return {
            ...e,
            x: Math.round(e.x * s),
            y: Math.round(e.y * s),
            w: Math.max(12, Math.round(e.w * s)),
            h: Math.max(8, Math.round(e.h * s)),
            props,
          };
        };
        return { ...p, frame, elements: p.elements.map(scaleEl) };
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

  function startDrag(ev, pageId, el) {
    if (preview) return;
    // Space / middle-button drag pans the canvas instead of moving an element.
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    setSelId(el.id);
    setActivePage(pageId);
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const ox = el.x;
    const oy = el.y;
    let moved = false;
    const move = (e2) => {
      const nx = Math.round(ox + (e2.clientX - sx) / zoom);
      const ny = Math.round(oy + (e2.clientY - sy) / zoom);
      if (nx !== ox || ny !== oy) moved = true;
      mapEl(el.id, (x) => ({ ...x, x: nx, y: ny }), false);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }
  function startResize(ev, el) {
    if (ev.button === 1 || spaceRef.current) return;
    ev.stopPropagation();
    const before = docRef.current;
    const sx = ev.clientX;
    const sy = ev.clientY;
    const ow = el.w;
    const oh = el.h;
    let moved = false;
    const move = (e2) => {
      const nw = Math.max(20, Math.round(ow + (e2.clientX - sx) / zoom));
      const nh = Math.max(16, Math.round(oh + (e2.clientY - sy) / zoom));
      if (nw !== ow || nh !== oh) moved = true;
      mapEl(el.id, (x) => ({ ...x, w: nw, h: nh }), false);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved && docRef.current !== before) pushPastSnapshot(before);
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

  const stateLabels = {
    normal: 'state.normal',
    loading: 'state.loading',
    empty: 'state.empty',
    error: 'state.error',
  };

  // -------------------------------------------------- toolbar
  const canUndo = histRef.current.past.length > 0;
  const canRedo = histRef.current.future.length > 0;
  const toolbar = h(
    'div',
    { className: 'dpd-toolbar' },
    h(
      'span',
      { className: 'dpd-brand' },
      h(
        'svg',
        {
          width: 18,
          height: 18,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('rect', { x: 1.5, y: 2, width: 13, height: 11.5, rx: 2 }),
        h('path', { d: 'M1.5 5.4h13' }),
        h('rect', { x: 3.6, y: 8, width: 4, height: 3.2, rx: 0.6 }),
        h('circle', { cx: 10.6, cy: 9.6, r: 1.4 }),
      ),
      t('app.title'),
    ),
    h('input', {
      className: 'dpd-nameInput',
      value: doc.name,
      placeholder: t('name.placeholder'),
      onChange: (e) => setDoc((d) => ({ ...d, name: e.target.value }), 'docname'),
    }),
    h('div', { className: 'dpd-spacer' }),
    h(
      'select',
      {
        className: 'dpd-select',
        value: (activePage && activePage.frame.preset) || 'mobile',
        title: t('frame.title'),
        onChange: (e) => setPreset(e.target.value),
      },
      ['mobile', 'tablet', 'desktop'].map((k) =>
        h('option', { key: k, value: k }, t('frame.' + k)),
      ),
    ),
    h(
      'div',
      { className: 'dpd-seg', title: t('frame.title') },
      ['normal', 'loading', 'empty', 'error'].map((s) =>
        h(
          'button',
          {
            key: s,
            type: 'button',
            className: pageState === s ? 'active' : '',
            onClick: () => setPageState(s),
          },
          t(stateLabels[s]),
        ),
      ),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: t('toolbar.undo'),
        disabled: !canUndo,
        style: { opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default' },
        onClick: undo,
      },
      h(IconUndo),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: t('toolbar.redo'),
        disabled: !canRedo,
        style: { opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'default' },
        onClick: redo,
      },
      h(IconRedo),
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: '缩小',
        onClick: () => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 10) / 10)),
      },
      h(IconMinus),
    ),
    h(
      'button',
      { className: 'dpd-zoom', type: 'button', title: '重置为 100%', onClick: () => setZoom(1) },
      Math.round(zoom * 100) + '%',
    ),
    h(
      'button',
      {
        className: 'dpd-iconbtn',
        type: 'button',
        title: '放大',
        onClick: () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10)),
      },
      h(IconPlus),
    ),
    h(
      'button',
      {
        className: 'dpd-btn' + (preview ? ' primary' : ''),
        type: 'button',
        onClick: () => {
          setPreview((v) => !v);
          setSelId(null);
        },
      },
      h(preview ? IconPencil : IconEye),
      preview ? t('toolbar.edit') : t('toolbar.preview'),
    ),
    h(
      'button',
      { className: 'dpd-iconbtn', type: 'button', title: t('toolbar.reset'), onClick: resetDoc },
      h(IconReset),
    ),
    h('span', { className: 'dpd-saved' }, t('toolbar.saved')),
  );

  // -------------------------------------------------- left: pages + library
  const pageRows = doc.pages.map((p) =>
    h(
      'div',
      {
        key: p.id,
        className: 'dpd-pageRow' + (p.id === activePage.id ? ' active' : ''),
        onClick: () => setActivePage(p.id),
      },
      h('span', { className: 'nm' }, p.name),
      h('span', { className: 'sz' }, p.frame.w + '×' + p.frame.h),
      h(
        'button',
        {
          className: 'dpd-mini',
          type: 'button',
          title: t('pages.duplicate'),
          onClick: (e) => {
            e.stopPropagation();
            duplicatePage(p.id);
          },
        },
        h(IconCopy),
      ),
      h(
        'button',
        {
          className: 'dpd-mini',
          type: 'button',
          title: t('pages.delete'),
          onClick: (e) => {
            e.stopPropagation();
            deletePage(p.id);
          },
        },
        h(IconTrash),
      ),
    ),
  );

  const activeElements = (activePage && activePage.elements) || [];
  const layers = activeElements.slice().reverse();

  const railBtn = (id, icon, label) =>
    h(
      'button',
      {
        type: 'button',
        className: 'dpd-railbtn' + (section === id ? ' active' : ''),
        title: label,
        'aria-label': label,
        onClick: () => setSection((cur) => (cur === id ? null : id)),
      },
      h(icon),
    );

  const pagesBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('pages.title')),
      h(
        'button',
        { className: 'dpd-mini', type: 'button', title: t('pages.add'), onClick: addPage },
        h(IconPlus),
      ),
    ),
    h('div', { className: 'dpd-pages' }, pageRows),
  );

  const componentsBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h('div', { className: 'dpd-panelTitle' }, h('span', null, t('library.title'))),
    h('div', { className: 'dpd-hint' }, t('library.hint')),
    h(
      'div',
      { className: 'dpd-libScroll' },
      h(
        'div',
        { className: 'dpd-libGrid' },
        LIB_ORDER.map((type) => {
          const sample = {
            id: 'lib-' + type,
            type,
            x: 0,
            y: 0,
            w: 120,
            h: 32,
            state: defaultState(type),
            props: {},
          };
          return h(
            'button',
            {
              key: type,
              type: 'button',
              className: 'dpd-libItem',
              onClick: () => addElement(type),
              title: t('comp.' + type),
            },
            h(
              'div',
              { className: 'dpd-libThumb' },
              h(
                'div',
                {
                  style: {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 96,
                    height: 30,
                    transform: 'translate(-50%,-50%) scale(.62)',
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                  },
                },
                renderWidget(sample, defaultState(type), t, {}),
              ),
            ),
            h('span', { className: 'dpd-libName' }, t('comp.' + type)),
          );
        }),
      ),
    ),
  );

  const layersBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('layers.title')),
      h(
        'span',
        {
          style: {
            textTransform: 'none',
            letterSpacing: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
        activePage ? activePage.name : '',
      ),
    ),
    h(
      'div',
      { className: 'dpd-layers' },
      layers.map((el) =>
        h(
          'div',
          {
            key: el.id,
            className: 'dpd-layer' + (selId === el.id ? ' active' : ''),
            onClick: () => {
              setSelId(el.id);
              setPreview(false);
              setActivePage(activePage.id);
            },
          },
          h('span', { className: 'dot' }, h(Svg, { size: 13 }, libGlyph(el.type))),
          h('span', { className: 'nm' }, el.props.text || t('comp.' + el.type)),
        ),
      ),
    ),
  );

  const sectionContent =
    section === 'pages'
      ? pagesBody
      : section === 'components'
        ? componentsBody
        : section === 'layers'
          ? layersBody
          : null;

  const left = h(
    'div',
    { className: 'dpd-leftcol' },
    h(
      'div',
      { className: 'dpd-rail' },
      railBtn('pages', IconPages, t('pages.title')),
      railBtn('components', IconComponents, t('library.title')),
      railBtn('layers', IconLayers, t('layers.title')),
    ),
    sectionContent
      ? h(
          'div',
          { className: 'dpd-sectionwrap', style: { width: leftWidth } },
          sectionContent,
          h('div', { className: 'dpd-resizer', onMouseDown: startResizeLeft }),
        )
      : null,
  );

  // -------------------------------------------------- canvas (all pages side by side)
  const positions = {};
  let cursorX = 0;
  doc.pages.forEach((p) => {
    positions[p.id] = cursorX;
    cursorX += p.frame.w + GAP;
  });
  const totalW = Math.max(1, cursorX - GAP);
  const maxH = doc.pages.reduce((m, p) => Math.max(m, p.frame.h), 0);
  const worldW = totalW;
  const worldH = LABEL + maxH;

  const pageLabels = doc.pages.map((p) =>
    h(
      'div',
      {
        key: p.id + '#lbl',
        className: 'dpd-pageLabel' + (p.id === activePage.id ? ' active' : ''),
        style: { left: positions[p.id], top: 4, height: LABEL - 8, cursor: 'pointer' },
        onMouseDown: (e) => e.stopPropagation(),
        onClick: () => setActivePage(p.id),
        title: p.name,
      },
      h('span', { className: 'pin' }, p.name),
      h('span', { className: 'sz' }, p.frame.w + '×' + p.frame.h),
    ),
  );

  const frameNodes = doc.pages.map((p) => {
    const pageActive = p.id === activePage.id;
    const els = p.elements.map((el) => {
      const st = renderStateFor(el);
      const u = ui[el.id] || {};
      const info = TYPE_INFO[el.type] || TYPE_INFO.text;
      const cursor = spaceDown
        ? panning
          ? 'grabbing'
          : 'grab'
        : preview
          ? info.interactive
            ? 'pointer'
            : 'default'
          : 'move';
      return h(
        'div',
        {
          key: el.id,
          className: 'dpd-el' + (selId === el.id && !preview ? ' dpd-sel' : ''),
          style: { left: el.x, top: el.y, width: el.w, height: el.h, cursor },
          onMouseDown: (ev) => {
            if (ev.button === 1 || spaceRef.current) return; // let the canvas pan
            if (preview) {
              if (el.type === 'button') setUiFor(el.id, { press: true });
              return;
            }
            startDrag(ev, p.id, el);
          },
          onMouseEnter: () => {
            if (preview && (el.type === 'button' || el.type === 'card'))
              setUiFor(el.id, { hover: true });
          },
          onMouseLeave: () => {
            if (preview) setUiFor(el.id, { hover: false, press: false });
          },
          onMouseUp: () => {
            if (preview && el.type === 'button') setUiFor(el.id, { press: false });
          },
          onClick: (ev) => {
            if (preview) {
              ev.stopPropagation();
              activate(el, ev);
            }
          },
        },
        h(
          'div',
          { style: { width: '100%', height: '100%', pointerEvents: 'none' } },
          renderWidget(el, st, t, { tabsActive: u.tabs, preview }),
        ),
      );
    });

    const selNode =
      sel && selPage && selPage.id === p.id && !preview
        ? h(
            'div',
            {
              className: 'dpd-selBox',
              style: { left: sel.x, top: sel.y, width: sel.w, height: sel.h },
            },
            h('div', { className: 'dpd-handle br', onMouseDown: (ev) => startResize(ev, sel) }),
          )
        : null;

    const overlay = pageActive && pageState !== 'normal' ? h(PageOverlay, { pageState, t }) : null;

    return h(
      'div',
      {
        key: p.id,
        className: 'dpd-frame',
        style: {
          left: positions[p.id],
          top: LABEL,
          width: p.frame.w,
          height: p.frame.h,
          background: p.frame.background || '#ffffff',
        },
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return; // let the canvas pan
          ev.stopPropagation();
          setActivePage(p.id);
          if (!preview) setSelId(null);
        },
      },
      els,
      selNode,
      overlay,
    );
  });

  const gridCell = 20 * zoom;
  const gridMinor = 'var(--dsw-alias-border-l1,#e2e5ec)';
  const gridMajor = 'var(--dsw-alias-border-l2,#cfd3db)';
  const gridImage =
    'linear-gradient(to right,' +
    gridMinor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to bottom,' +
    gridMinor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to right,' +
    gridMajor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to bottom,' +
    gridMajor +
    ' 1px,transparent 1px)';
  const gridSize =
    gridCell +
    'px ' +
    gridCell +
    'px,' +
    gridCell +
    'px ' +
    gridCell +
    'px,' +
    gridCell * 5 +
    'px ' +
    gridCell * 5 +
    'px,' +
    gridCell * 5 +
    'px ' +
    gridCell * 5 +
    'px';

  const canvas = h(
    'div',
    {
      className: 'dpd-canvas',
      ref: canvasRef,
      title: t('toolbar.panHint'),
      style: { cursor: panning ? 'grabbing' : spaceDown ? 'grab' : 'default' },
      onMouseDown: (ev) => {
        if (ev.button === 1 || spaceRef.current) {
          startPan(ev);
          return;
        }
        if (!preview) setSelId(null);
        else setUi({});
      },
    },
    h(
      'div',
      {
        className: 'dpd-canvasinner',
        style: { backgroundImage: gridImage, backgroundSize: gridSize, backgroundPosition: '0 0' },
      },
      h(
        'div',
        { className: 'dpd-stage', style: { width: worldW * zoom, height: worldH * zoom } },
        h(
          'div',
          {
            className: 'dpd-world',
            style: {
              width: worldW,
              height: worldH,
              transform: 'scale(' + zoom + ')',
              transformOrigin: 'top left',
            },
          },
          pageLabels,
          frameNodes,
        ),
      ),
    ),
  );

  // -------------------------------------------------- right: inspector + layers
  function numInput(value, onChange) {
    return h('input', {
      className: 'dpd-input',
      type: 'number',
      value: value,
      onChange: (e) => {
        const v = parseInt(e.target.value, 10);
        onChange(isNaN(v) ? 0 : v);
      },
    });
  }

  let inspectorBody;
  if (sel) {
    const info = TYPE_INFO[sel.type] || TYPE_INFO.text;
    const stateList = info.states || ['default'];
    inspectorBody = h(
      'div',
      null,
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.position')),
        h(
          'div',
          { className: 'dpd-numPair' },
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'X'),
            numInput(sel.x, (v) => setEl(sel.id, { x: v }, 'x:' + sel.id)),
          ),
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'Y'),
            numInput(sel.y, (v) => setEl(sel.id, { y: v }, 'y:' + sel.id)),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.size')),
        h(
          'div',
          { className: 'dpd-numPair' },
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'W'),
            numInput(sel.w, (v) => setEl(sel.id, { w: Math.max(16, v) }, 'w:' + sel.id)),
          ),
          h(
            'div',
            { className: 'dpd-field' },
            h('span', null, 'H'),
            numInput(sel.h, (v) => setEl(sel.id, { h: Math.max(12, v) }, 'h:' + sel.id)),
          ),
        ),
      ),
      info.hasText
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.text')),
            h('input', {
              className: 'dpd-input',
              type: 'text',
              value: sel.props.text || '',
              placeholder: t('sample.text'),
              onChange: (e) => setElProps(sel.id, { text: e.target.value }, 'text:' + sel.id),
            }),
          )
        : null,
      info.hasColor || info.hasText
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.color')),
            h('input', {
              className: 'dpd-color',
              type: 'color',
              value: sel.props.color || ACCENT,
              onChange: (e) => setElProps(sel.id, { color: e.target.value }, 'color:' + sel.id),
            }),
            h('input', {
              className: 'dpd-input',
              type: 'text',
              value: sel.props.color || ACCENT,
              onChange: (e) => setElProps(sel.id, { color: e.target.value }, 'color:' + sel.id),
            }),
          )
        : null,
      info.hasFont
        ? h(
            'div',
            { className: 'dpd-row' },
            h('label', null, t('inspector.fontSize')),
            numInput(sel.props.fontSize || 14, (v) =>
              setElProps(sel.id, { fontSize: v }, 'fs:' + sel.id),
            ),
          )
        : null,
      h(
        'div',
        { className: 'dpd-row' },
        h('label', null, t('inspector.radius')),
        numInput(sel.props.radius != null ? sel.props.radius : 8, (v) =>
          setElProps(sel.id, { radius: v }, 'radius:' + sel.id),
        ),
      ),
      h(
        'div',
        { className: 'dpd-section' },
        h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.state'))),
        h(
          'div',
          { className: 'dpd-chips' },
          stateList.map((s) =>
            h(
              'button',
              {
                key: s,
                type: 'button',
                className:
                  'dpd-chip' + ((sel.state || defaultState(sel.type)) === s ? ' active' : ''),
                onClick: () => setEl(sel.id, { state: s }),
              },
              t('stateName.' + s),
            ),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dpd-actions' },
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: duplicateEl },
          h(IconCopy),
          t('inspector.duplicate'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: bringFront },
          h(IconFront),
          t('inspector.front'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: sendBack },
          h(IconBack),
          t('inspector.back'),
        ),
        h(
          'button',
          { className: 'dpd-btn', type: 'button', onClick: deleteEl },
          h(IconTrash),
          t('inspector.delete'),
        ),
      ),
    );
  } else {
    inspectorBody = h(
      'div',
      null,
      h('div', { className: 'dpd-empty' }, t('inspector.empty')),
      h(
        'div',
        { className: 'dpd-section' },
        h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.frame'))),
        h(
          'div',
          { className: 'dpd-row' },
          h('label', null, t('inspector.pageName')),
          h('input', {
            className: 'dpd-input',
            type: 'text',
            value: activePage ? activePage.name : '',
            onChange: (e) => renameActivePage(e.target.value),
          }),
        ),
        h(
          'div',
          { className: 'dpd-row' },
          h('label', null, t('frame.title')),
          h(
            'select',
            {
              className: 'dpd-select',
              style: { flex: 1 },
              value: (activePage && activePage.frame.preset) || 'mobile',
              onChange: (e) => setPreset(e.target.value),
            },
            ['mobile', 'tablet', 'desktop'].map((k) =>
              h('option', { key: k, value: k }, t('frame.' + k)),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dpd-row' },
          h('label', null, t('inspector.background')),
          h('input', {
            className: 'dpd-color',
            type: 'color',
            value: (activePage && activePage.frame.background) || '#ffffff',
            onChange: (e) => patchActiveFrame({ background: e.target.value }),
          }),
          h('input', {
            className: 'dpd-input',
            type: 'text',
            value: (activePage && activePage.frame.background) || '#ffffff',
            onChange: (e) => patchActiveFrame({ background: e.target.value }),
          }),
        ),
      ),
    );
  }

  const right = h(
    'div',
    { className: 'dpd-right' },
    h('div', { className: 'dpd-panelTitle' }, h('span', null, t('inspector.title'))),
    inspectorBody,
  );

  return h(
    'div',
    { className: 'dpd-root', 'data-dsh-plugin': 'product-design' },
    h(StyleBlock),
    toolbar,
    h('div', { className: 'dpd-body' }, left, canvas, right),
  );
}

export { ProductDesignPanel };
