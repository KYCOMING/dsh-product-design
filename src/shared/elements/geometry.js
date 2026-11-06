/** geometry helpers for element trees (split from shared/elements.js). */
import { isContainer } from './base.js';

export function boundsOfEntries(entries) {
  if (!entries || !entries.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of entries) {
    minX = Math.min(minX, e.absX);
    minY = Math.min(minY, e.absY);
    maxX = Math.max(maxX, e.absX + e.w);
    maxY = Math.max(maxY, e.absY + e.h);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInBox(x, y, box, pad = 0) {
  return (
    !!box &&
    x >= box.x - pad &&
    x <= box.x + box.w + pad &&
    y >= box.y - pad &&
    y <= box.y + box.h + pad
  );
}

/**
 * Find the deepest visible container under a point, excluding the dragged
 * element and its descendants (a container cannot be dropped into itself).
 */

export function findDropContainer(entries, excludeIds, x, y) {
  let best = null;
  for (const entry of entries) {
    if (!entry || entry.el.type !== 'container') continue;
    if (excludeIds && excludeIds.has(entry.el.id)) continue;
    if (!pointInBox(x, y, { x: entry.absX, y: entry.absY, w: entry.w, h: entry.h })) continue;
    if (!best || entry.depth > best.depth) best = entry;
  }
  return best;
}

/** Deep-clone an element subtree, assigning fresh ids. */

export function scaleElementsInTree(elements, sx, sy, sf, ox = 0, oy = 0, isRoot = true) {
  return elements.map((el) => {
    const props = { ...(el.props || {}) };
    if (typeof props.fontSize === 'number')
      props.fontSize = Math.max(8, Math.round(props.fontSize * sf));
    if (typeof props.radius === 'number') props.radius = Math.max(0, Math.round(props.radius * sf));
    const out = {
      ...el,
      x: Math.round((isRoot ? el.x - ox : el.x) * sx),
      y: Math.round((isRoot ? el.y - oy : el.y) * sy),
      w: Math.max(12, Math.round(el.w * sx)),
      h: Math.max(8, Math.round(el.h * sy)),
      props,
    };
    if (isContainer(el) && Array.isArray(el.children)) {
      out.children = scaleElementsInTree(el.children, sx, sy, sf, 0, 0, false);
    }
    return out;
  });
}

/**
 * Remove every element whose id is in `idSet`, recursively. Returns a new array
 * only when something changed. Single shared implementation used by both the
 * host reducer and the client domain (previously duplicated).
 */
