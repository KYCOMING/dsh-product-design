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

/** Replace one list reference inside the tree (used by pure reorder helpers). */
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
export function insertIntoTree(elements, targetId, node, position) {
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
