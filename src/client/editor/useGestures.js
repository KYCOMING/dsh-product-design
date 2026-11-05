/**
 * Canvas gestures: move, resize, marquee, pan, snapping and stack reordering.
 *
 * All handlers are imperative (window mousemove/mouseup) and read the live
 * document through `docRef`, so they never operate on a stale render.
 */

import {
  boundsOfEntries,
  collectElementEntries,
  descendantIds,
  findDropContainer,
  findElementEntry,
  isContainerType,
  isUnderAny,
  pointInBox,
} from '../../shared/elements.js';
import { SNAP_THRESHOLD, snapMoveBox, snapResizeBox } from '../../shared/snapping.js';
import { appendToContainer, extractFromTree, mapTree } from '../domain/tree.js';
import { useEffect, useState } from '../react.js';

export function useGestures({
  docRef,
  setDoc,
  mapEl,
  activePage,
  setActivePage,
  selIds,
  setSelIds,
  zoomRef,
  snapRef,
  canvasRef,
  spaceRef,
  pushPastSnapshot,
}) {
  const [guides, setGuides] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

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
    const primary = allEntries.find((entry) => entry.el.id === el.id);
    if (primary && ids.length === 1 && primary.parent && primary.parent.layout?.mode === 'stack') {
      startStackDrag(ev, page, primary, docRef.current);
      return;
    }
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

  /**
   * Dragging a child of an auto-layout container reorders it instead of moving
   * it freely: the layout owns x/y, the user owns the order.
   */
  function startStackDrag(ev, page, entry, before) {
    const parent = entry.parent;
    const row = parent.layout.direction === 'row';
    const startMain = row ? entry.absX + entry.w / 2 : entry.absY + entry.h / 2;
    const sx = ev.clientX;
    const sy = ev.clientY;
    let changed = false;
    const move = (e2) => {
      const zoomNow = zoomRef.current || 1;
      const dx = (e2.clientX - sx) / zoomNow;
      const dy = (e2.clientY - sy) / zoomNow;
      const pointer = startMain + (row ? dx : dy);
      const live = docRef.current.pages.find((p) => p.id === page.id);
      if (!live) return;
      const liveParent = findElementEntry(live.elements, parent.id);
      if (!liveParent) return;
      const kids = liveParent.el.children || [];
      const others = kids.filter((kid) => kid.id !== entry.el.id);
      const parentAbs = row ? liveParent.absX : liveParent.absY;
      let index = 0;
      for (const kid of others) {
        const center = parentAbs + (row ? kid.x + kid.w / 2 : kid.y + kid.h / 2);
        if (center < pointer) index += 1;
      }
      const currentIndex = kids.findIndex((kid) => kid.id === entry.el.id);
      if (index === currentIndex) return;
      changed = true;
      setDoc(
        (d) => ({
          ...d,
          pages: d.pages.map((p) => {
            if (p.id !== page.id) return p;
            return {
              ...p,
              elements: mapTree(p.elements, (node) => {
                if (node.id !== parent.id) return node;
                const list = (node.children || []).slice();
                const from = list.findIndex((kid) => kid.id === entry.el.id);
                if (from === -1) return node;
                const [item] = list.splice(from, 1);
                list.splice(Math.max(0, Math.min(list.length, index)), 0, item);
                return { ...node, children: list };
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
      if (changed && docRef.current !== before) pushPastSnapshot(before);
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
    const page = docRef.current.pages.find((p) => p.id === activePage.id);
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
    const startChildren = Array.isArray(entry.el.children) ? entry.el.children : null;
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
      const nextW = Math.round(next.w);
      const nextH = Math.round(next.h);
      mapEl(
        el.id,
        (cur) => {
          const box = {
            ...cur,
            x: Math.round(next.x - parentAbsX),
            y: Math.round(next.y - parentAbsY),
            w: nextW,
            h: nextH,
          };
          // A container resize propagates through its children's constraints.
          if (!startChildren) return box;
          return {
            ...box,
            children: startChildren.map((child) => resizeElement(child, ow, oh, nextW, nextH)),
          };
        },
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
    if (ev.button === 1 || spaceRef.current) return;
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

  return {
    guides,
    marquee,
    panning,
    spaceDown,
    startDrag,
    startResize,
    startMarquee,
    startPan,
  };
}
