/** mutate helpers for element trees (split from shared/elements.js). */
import { cloneElementDeep, isContainer } from './base.js';
import { boundsOfEntries } from './geometry.js';
import { descendantIds, findElementEntry } from './query.js';

function replaceList(elements, oldList, newList) {
  if (elements === oldList) return newList;
  let changed = false;
  const out = elements.map((el) => {
    if (isContainer(el) && Array.isArray(el.children)) {
      const kids = replaceList(el.children, oldList, newList);
      if (kids !== el.children) {
        changed = true;
        return { ...el, children: kids };
      }
    }
    return el;
  });
  return changed ? out : elements;
}

/** Remove one element (with its subtree) from the tree, returning the new root list. */

export function extractFromTree(elements, id) {
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
      if (isContainer(el) && Array.isArray(el.children)) {
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

/**
 * Insert `node` relative to `targetId`: before / after it, or as its last child.
 * @returns {object[]} the new root list (unchanged when the target is missing)
 */

function insertIntoTree(elements, targetId, node, position) {
  let inserted = false;
  const walk = (list) => {
    const out = [];
    for (const el of list) {
      if (el.id === targetId) {
        if (position === 'inside' && isContainer(el)) {
          out.push({ ...el, children: [...(el.children || []), node] });
        } else if (position === 'before') {
          out.push(node, el);
        } else {
          out.push(el, node);
        }
        inserted = true;
        continue;
      }
      if (isContainer(el) && Array.isArray(el.children)) {
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
  return inserted ? next : elements;
}

/**
 * Move an element in the tree while keeping its on-screen position.
 * `position`: 'before' | 'after' | 'inside'.
 * Refuses to move a container into itself or one of its descendants.
 */

export function moveElementInTree(elements, id, targetId, position) {
  if (!id || !targetId || id === targetId) return elements;
  const src = findElementEntry(elements, id);
  if (!src) return elements;
  if (isContainer(src.el) && descendantIds(src.el).includes(targetId)) return elements;
  const absX = src.absX;
  const absY = src.absY;
  const extracted = extractFromTree(elements, id);
  if (!extracted.extracted) return elements;
  const target = findElementEntry(extracted.elements, targetId);
  if (!target) return elements;
  if (position === 'inside' && !isContainer(target.el)) return elements;
  const parentAbsX = position === 'inside' ? target.absX : target.absX - target.el.x;
  const parentAbsY = position === 'inside' ? target.absY : target.absY - target.el.y;
  const moved = {
    ...extracted.extracted,
    x: Math.round(absX - parentAbsX),
    y: Math.round(absY - parentAbsY),
  };
  return insertIntoTree(extracted.elements, targetId, moved, position);
}

/** Reorder one element among its siblings: front | back | forward | backward. */

export function reorderInTree(elements, id, mode) {
  const entry = findElementEntry(elements, id);
  if (!entry) return elements;
  const list = entry.list;
  const from = entry.index;
  let to = from;
  if (mode === 'front') to = list.length - 1;
  else if (mode === 'back') to = 0;
  else if (mode === 'forward') to = Math.min(list.length - 1, from + 1);
  else if (mode === 'backward') to = Math.max(0, from - 1);
  if (to === from) return elements;
  const next = list.slice();
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el);
  return replaceList(elements, list, next);
}

/**
 * Scale a page's element tree when its frame changes size.
 *
 * Coordinates and sizes follow their own axis ratio (so a page keeps filling
 * the frame), while font size / radius follow the smaller ratio so type never
 * gets stretched out of proportion. Root coordinates are offset by ox/oy first;
 * children are already relative to their parent.
 */

export function removeElementsFromTree(elements, idSet) {
  let changed = false;
  const out = [];
  for (const el of elements) {
    if (idSet.has(el.id)) {
      changed = true;
      continue;
    }
    if (isContainer(el) && Array.isArray(el.children)) {
      const kids = removeElementsFromTree(el.children, idSet);
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

/**
 * Build a `group` element wrapping `entries` (which must share a parent),
 * re-basing each child to be relative to the group's bounds. Shared by the host
 * `group_elements` op and the client `groupEntries` transform.
 */

export function buildGroupFromEntries(entries, { id, name = '' } = {}) {
  const bounds = boundsOfEntries(entries);
  if (!bounds) return null;
  const parentAbsX = entries[0].absX - entries[0].el.x;
  const parentAbsY = entries[0].absY - entries[0].el.y;
  return {
    id,
    type: 'group',
    name,
    x: bounds.x - parentAbsX,
    y: bounds.y - parentAbsY,
    w: bounds.w,
    h: bounds.h,
    hidden: false,
    locked: false,
    opacity: 1,
    state: 'default',
    props: {},
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
}

/** Expand a group's children back to the parent coordinate space. */

export function ungroupChildren(group) {
  return (group.children || []).map((child) => {
    const copy = cloneElementDeep(child);
    copy.x += group.x;
    copy.y += group.y;
    return copy;
  });
}
