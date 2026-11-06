/** base helpers for element trees (split from shared/elements.js). */
const CONTAINER_TYPES = ['container', 'group'];

export function isContainerType(type) {
  return CONTAINER_TYPES.indexOf(type) !== -1;
}

export function isContainer(el) {
  return !!el && isContainerType(el.type);
}

/**
 * Flatten a page element tree into entries carrying the parent context.
 * @returns {Array<{el:object,parent:object|null,ancestors:string[],list:object[],index:number,depth:number,absX:number,absY:number,w:number,h:number}>}
 */

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
