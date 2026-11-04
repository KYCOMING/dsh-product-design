/**
 * Element-tree helpers shared by the browser editor and the host reducer.
 *
 * The document keeps a tree per page: `page.elements` is the root list, and
 * container / group elements carry `children` with coordinates relative to
 * their parent. All helpers here are pure and safe to use from both halves.
 */

const CONTAINER_TYPES = ['container', 'group'];

export function isContainerType(type) {
  return CONTAINER_TYPES.indexOf(type) !== -1;
}

export function isContainer(el) {
  return !!el && isContainerType(el.type);
}

export function childrenOf(el) {
  return isContainer(el) && Array.isArray(el.children) ? el.children : [];
}

/**
 * Flatten a page element tree into entries carrying the parent context.
 * @returns {Array<{el:object,parent:object|null,ancestors:string[],list:object[],index:number,depth:number,absX:number,absY:number,w:number,h:number}>}
 */
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
export function cloneElementDeep(el, nextId) {
  if (!el || typeof el !== 'object') return null;
  const copy = { ...el, props: { ...(el.props || {}) } };
  copy.id = nextId ? nextId(el.id) : el.id;
  if (isContainer(el) && Array.isArray(el.children)) {
    copy.children = el.children.map((child) => cloneElementDeep(child, nextId));
  } else {
    delete copy.children;
  }
  return copy;
}

/** Collect ids of an element subtree. */
export function elementIds(el, out = []) {
  if (!el) return out;
  out.push(el.id);
  if (isContainer(el)) {
    for (const child of el.children || []) elementIds(child, out);
  }
  return out;
}
