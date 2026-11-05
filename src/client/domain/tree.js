/**
 * Immutable element-tree helpers used by the editor controllers.
 *
 * The document stores containers/groups as nested `children`; these helpers
 * return new arrays only when something actually changed, so React state can
 * rely on reference equality.
 */

import { isContainerType } from '../../shared/elements.js';

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

export {
  appendToContainer,
  duplicateInTree,
  extractFromTree,
  mapTree,
  removeFromTree,
  replaceInTree,
};
