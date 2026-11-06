/** query helpers for element trees (split from shared/elements.js). */
import { isContainer } from './base.js';

export function collectElementEntries(
  elements,
  parent = null,
  parentAbsX = 0,
  parentAbsY = 0,
  depth = 0,
  ancestors = [],
) {
  const out = [];
  if (!Array.isArray(elements)) return out;
  elements.forEach((el, index) => {
    if (!el || typeof el !== 'object') return;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const w = Math.max(0, Number(el.w) || 0);
    const h = Math.max(0, Number(el.h) || 0);
    const absX = parentAbsX + x;
    const absY = parentAbsY + y;
    out.push({ el, parent, ancestors, list: elements, index, depth, absX, absY, w, h });
    if (isContainer(el) && Array.isArray(el.children) && el.children.length) {
      out.push(
        ...collectElementEntries(el.children, el, absX, absY, depth + 1, [...ancestors, el.id]),
      );
    }
  });
  return out;
}

export function findElementEntry(
  elements,
  id,
  parent = null,
  parentAbsX = 0,
  parentAbsY = 0,
  depth = 0,
  ancestors = [],
) {
  if (!Array.isArray(elements) || !id) return null;
  for (let index = 0; index < elements.length; index += 1) {
    const el = elements[index];
    if (!el || typeof el !== 'object') continue;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const absX = parentAbsX + x;
    const absY = parentAbsY + y;
    if (el.id === id) {
      return {
        el,
        parent,
        ancestors,
        list: elements,
        index,
        depth,
        absX,
        absY,
        w: Math.max(0, Number(el.w) || 0),
        h: Math.max(0, Number(el.h) || 0),
      };
    }
    if (isContainer(el) && Array.isArray(el.children)) {
      const found = findElementEntry(el.children, id, el, absX, absY, depth + 1, [
        ...ancestors,
        el.id,
      ]);
      if (found) return found;
    }
  }
  return null;
}

/** All descendant ids of an element (excluding the element itself). */

export function descendantIds(el, out = []) {
  if (!el || !isContainer(el) || !Array.isArray(el.children)) return out;
  for (const child of el.children) {
    if (!child) continue;
    out.push(child.id);
    descendantIds(child, out);
  }
  return out;
}

/** Is `entry` nested somewhere under any of the given element ids? */

export function isUnderAny(entry, ancestorIds) {
  if (!entry || !Array.isArray(entry.ancestors) || !ancestorIds || !ancestorIds.length)
    return false;
  return entry.ancestors.some((id) => ancestorIds.indexOf(id) !== -1);
}

export function elementIds(el, out = []) {
  if (!el) return out;
  out.push(el.id);
  if (isContainer(el)) {
    for (const child of el.children || []) elementIds(child, out);
  }
  return out;
}

/** Replace one list reference inside the tree (used by pure reorder helpers). */
