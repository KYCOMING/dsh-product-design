/**
 * Pure document transforms.
 *
 * Every function takes a document and returns a new one (or the same reference
 * when nothing changed). No React, no DOM, no storage: the editor hooks call
 * these inside `setDoc`, and they can be unit-tested in isolation.
 */

import {
  boundsOfEntries,
  cloneElementDeep,
  collectElementEntries,
  findElementEntry,
  moveElementInTree,
  reorderInTree,
  scaleElementsInTree,
} from '../../shared/elements.js';
import { reflowPage, resizePage } from '../../shared/layout.js';
import { uid } from '../model.js';
import { appendToContainer, duplicateInTree, mapTree, removeFromTree } from './tree.js';

export function activePageOf(doc) {
  return doc.pages.find((page) => page.id === doc.activePageId) || doc.pages[0] || null;
}

function mapPage(doc, pageId, fn) {
  return { ...doc, pages: doc.pages.map((page) => (page.id === pageId ? fn(page) : page)) };
}

function mapElements(doc, pageId, fn) {
  return mapPage(doc, pageId, (page) => ({ ...page, elements: fn(page.elements) }));
}

// ------------------------------------------------------------------
// pages
// ------------------------------------------------------------------
export function addPage(doc, page) {
  return { ...doc, pages: [...doc.pages, page], activePageId: page.id };
}

export function insertPageAfter(doc, afterId, page) {
  const index = doc.pages.findIndex((candidate) => candidate.id === afterId);
  if (index === -1) return doc;
  const pages = doc.pages.slice();
  pages.splice(index + 1, 0, page);
  return { ...doc, pages, activePageId: page.id };
}

export function removePage(doc, pageId) {
  if (doc.pages.length <= 1) return doc;
  const index = doc.pages.findIndex((page) => page.id === pageId);
  if (index === -1) return doc;
  const pages = doc.pages.filter((page) => page.id !== pageId);
  const activePageId =
    doc.activePageId === pageId
      ? pages[Math.max(0, Math.min(pages.length - 1, index - 1))].id
      : doc.activePageId;
  return { ...doc, pages, activePageId };
}

export function renamePage(doc, pageId, name) {
  return mapPage(doc, pageId, (page) => ({ ...page, name }));
}

export function patchFrame(doc, pageId, patch) {
  return mapPage(doc, pageId, (page) => ({ ...page, frame: { ...page.frame, ...patch } }));
}

export function resizePageTo(doc, pageId, width, height, mode, preset) {
  return mapPage(doc, pageId, (page) => {
    const resized = resizePage(page, width, height, mode);
    return preset ? { ...resized, frame: { ...resized.frame, preset } } : resized;
  });
}

export function patchPageStates(doc, pageId, key, patch) {
  return mapPage(doc, pageId, (page) => ({
    ...page,
    states: {
      ...(page.states || {}),
      [key]: { ...((page.states || {})[key] || {}), ...patch },
    },
  }));
}

/** Scale the page content's bounding box so it fills the frame. */
export function fitContent(doc, pageId) {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page || !page.elements.length) return doc;
  const bounds = boundsOfEntries(collectElementEntries(page.elements));
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return doc;
  const sx = page.frame.w / bounds.w;
  const sy = page.frame.h / bounds.h;
  return mapPage(doc, pageId, (target) => ({
    ...target,
    elements: scaleElementsInTree(target.elements, sx, sy, Math.min(sx, sy), bounds.x, bounds.y),
  }));
}

// ------------------------------------------------------------------
// elements
// ------------------------------------------------------------------
export function addElement(doc, pageId, parentId, el) {
  return mapElements(doc, pageId, (elements) =>
    parentId ? appendToContainer(elements, parentId, el) : [...elements, el],
  );
}

export function removeElements(doc, pageId, ids) {
  return mapElements(doc, pageId, (elements) => removeFromTree(elements, new Set(ids)));
}

/** @returns {{doc: object, ids: string[]}} */
export function duplicateElements(doc, pageId, ids) {
  const roots = [];
  const next = mapElements(doc, pageId, (elements) =>
    duplicateInTree(elements, new Set(ids), roots),
  );
  return { doc: next, ids: roots };
}

export function reorderElements(doc, pageId, ids, mode) {
  return mapElements(doc, pageId, (elements) => {
    let next = elements;
    for (const id of ids) next = reorderInTree(next, id, mode);
    return next;
  });
}

export function moveElementTo(doc, pageId, id, targetId, position) {
  return mapElements(doc, pageId, (elements) =>
    moveElementInTree(elements, id, targetId, position),
  );
}

export function patchElements(doc, pageId, ids, fn) {
  const idSet = new Set(ids);
  return mapElements(doc, pageId, (elements) =>
    mapTree(elements, (el) => (idSet.has(el.id) ? fn(el) : el)),
  );
}

export function moveElementsBy(doc, pageId, ids, dx, dy) {
  return patchElements(doc, pageId, ids, (el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
}

/** Patch one element wherever it lives (preview interactions run on any page). */
export function patchElement(doc, elementId, fn) {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      elements: mapTree(page.elements, (el) => (el.id === elementId ? fn(el) : el)),
    })),
  };
}

/** Update text on an element in any page (used by the inline editor). */
export function setElementText(doc, elementId, text) {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      elements: mapTree(page.elements, (el) =>
        el.id === elementId ? { ...el, props: { ...el.props, text } } : el,
      ),
    })),
  };
}

/** Paste clipboard payload: absolute coordinates are preserved, offset by 16px. */
export function pasteElements(doc, pageId, items, targetId) {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page || !items.length) return { doc, ids: [] };
  const target = targetId ? findElementEntry(page.elements, targetId) : null;
  const ids = [];
  const copies = items.map((item) => {
    const copy = cloneElementDeep(item.el, () => uid());
    copy.x = Math.round(item.absX + 16 - (target ? target.absX : 0));
    copy.y = Math.round(item.absY + 16 - (target ? target.absY : 0));
    ids.push(copy.id);
    return copy;
  });
  const next = mapElements(doc, pageId, (elements) => {
    if (!target) return [...elements, ...copies];
    let out = elements;
    for (const copy of copies) out = appendToContainer(out, targetId, copy);
    return out;
  });
  return { doc: next, ids };
}

// ------------------------------------------------------------------
// arrange
// ------------------------------------------------------------------
export function groupEntries(doc, pageId, entries, name) {
  if (entries.length < 2) return { doc, groupId: null };
  const list = entries[0].list;
  if (!entries.every((entry) => entry.list === list)) return { doc, groupId: null };
  const bounds = boundsOfEntries(entries);
  if (!bounds) return { doc, groupId: null };
  const parentAbsX = entries[0].absX - entries[0].el.x;
  const parentAbsY = entries[0].absY - entries[0].el.y;
  const group = {
    id: uid(),
    type: 'group',
    name: '',
    x: bounds.x - parentAbsX,
    y: bounds.y - parentAbsY,
    w: bounds.w,
    h: bounds.h,
    hidden: false,
    locked: false,
    opacity: 1,
    state: 'default',
    props: { name },
    interactions: [],
    constraints: { h: 'leftRight', v: 'top' },
    layout: null,
    children: entries.map((entry) => {
      const copy = cloneElementDeep(entry.el);
      copy.x = entry.absX - bounds.x;
      copy.y = entry.absY - bounds.y;
      return copy;
    }),
  };
  const ids = new Set(entries.map((entry) => entry.el.id));
  const insertAt = Math.min(...entries.map((entry) => entry.index));
  const remaining = list.filter((el) => !ids.has(el.id));
  remaining.splice(insertAt, 0, group);
  const next = mapElements(doc, pageId, (elements) => {
    if (!entries[0].parent) return remaining;
    return mapTree(elements, (el) =>
      el.id === entries[0].parent.id ? { ...el, children: remaining } : el,
    );
  });
  return { doc: next, groupId: group.id };
}

export function ungroupEntry(doc, pageId, id) {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  const entry = page ? findElementEntry(page.elements, id) : null;
  if (!entry || entry.el.type !== 'group') return { doc, ids: [] };
  const group = entry.el;
  const kids = (group.children || []).map((child) => {
    const copy = cloneElementDeep(child);
    copy.x += group.x;
    copy.y += group.y;
    return copy;
  });
  const next = entry.list.slice();
  next.splice(entry.index, 1, ...kids);
  const out = mapElements(doc, pageId, (elements) => {
    if (!entry.parent) return next;
    return mapTree(elements, (el) => (el.id === entry.parent.id ? { ...el, children: next } : el));
  });
  return { doc: out, ids: kids.map((kid) => kid.id) };
}

export function alignEntries(doc, pageId, entries, target, mode) {
  const ids = new Set(entries.map((entry) => entry.el.id));
  return mapElements(doc, pageId, (elements) =>
    mapTree(elements, (el) => {
      if (!ids.has(el.id)) return el;
      const entry = findElementEntry(elements, el.id);
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
  );
}

export function distributeEntries(doc, pageId, entries, axis) {
  if (entries.length < 3) return doc;
  const sorted = entries.slice().sort((a, b) => (axis === 'x' ? a.absX - b.absX : a.absY - b.absY));
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
  return mapElements(doc, pageId, (elements) =>
    mapTree(elements, (el) => {
      if (!positions.has(el.id)) return el;
      const entry = findElementEntry(elements, el.id);
      if (!entry) return el;
      const parentAbs = axis === 'x' ? entry.absX - el.x : entry.absY - el.y;
      const pos = Math.round(positions.get(el.id) - parentAbs);
      return axis === 'x' ? { ...el, x: pos } : { ...el, y: pos };
    }),
  );
}

/** Reflow helper for callers that mutate pages directly. */
export function reflow(doc) {
  return { ...doc, pages: doc.pages.map(reflowPage) };
}
