/**
 * Layout engine shared by the Host reducer and the browser canvas.
 *
 * Two orthogonal mechanisms:
 *   constraints — how an element reacts when its parent frame resizes
 *   auto layout — a container that stacks its children (gap / padding / align)
 *
 * Everything here is pure and structurally shared: unchanged elements keep
 * their identity, so the client can reflow on every edit without recording
 * empty history steps or re-rendering unrelated nodes.
 */

import { isContainer, scaleElementsInTree } from './elements.js';

export const H_MODES = ['left', 'right', 'leftRight', 'center', 'scale'];
export const V_MODES = ['top', 'bottom', 'topBottom', 'center', 'scale'];
export const RESIZE_MODES = ['constraints', 'scale', 'none'];
export const ALIGN_MODES = ['start', 'center', 'end', 'stretch'];
export const JUSTIFY_MODES = ['start', 'center', 'end', 'between'];
export const DIRECTIONS = ['row', 'column'];

/** Types that span the frame width by default, so they stretch with it. */
const STRETCH_TYPES = ['navbar', 'tabs', 'card', 'image', 'input', 'container', 'group'];

export function defaultConstraints(type) {
  return { h: STRETCH_TYPES.includes(type) ? 'leftRight' : 'left', v: 'top' };
}

export function normalizeConstraints(raw, type) {
  const fallback = defaultConstraints(type);
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    h: H_MODES.includes(src.h) ? src.h : fallback.h,
    v: V_MODES.includes(src.v) ? src.v : fallback.v,
  };
}

function normalizePadding(raw) {
  if (typeof raw === 'number') {
    const v = Math.max(0, Math.round(raw));
    return { t: v, r: v, b: v, l: v };
  }
  const src = raw && typeof raw === 'object' ? raw : {};
  const pick = (key) => Math.max(0, Math.round(Number(src[key]) || 0));
  return { t: pick('t'), r: pick('r'), b: pick('b'), l: pick('l') };
}

export function normalizeLayout(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mode = raw.mode === 'stack' ? 'stack' : null;
  if (!mode) return null;
  return {
    mode,
    direction: DIRECTIONS.includes(raw.direction) ? raw.direction : 'column',
    gap: Math.max(0, Math.round(Number(raw.gap) || 0)),
    padding: normalizePadding(raw.padding),
    align: ALIGN_MODES.includes(raw.align) ? raw.align : 'start',
    justify: JUSTIFY_MODES.includes(raw.justify) ? raw.justify : 'start',
  };
}

/** One axis of the constraint solver. */
function solveAxis(pos, size, oldParent, newParent, mode, minSize) {
  if (oldParent <= 0 || oldParent === newParent) return [pos, size];
  if (mode === 'right' || mode === 'bottom') {
    const edge = oldParent - (pos + size);
    return [newParent - edge - size, size];
  }
  if (mode === 'leftRight' || mode === 'topBottom') {
    const start = pos;
    const end = oldParent - (pos + size);
    return [start, Math.max(minSize, newParent - start - end)];
  }
  if (mode === 'center') {
    const offset = pos + size / 2 - oldParent / 2;
    return [Math.round(newParent / 2 + offset - size / 2), size];
  }
  if (mode === 'scale') {
    const ratio = newParent / oldParent;
    return [Math.round(pos * ratio), Math.max(minSize, Math.round(size * ratio))];
  }
  return [pos, size];
}

/**
 * Resize one element from its parent's old size to the new size, applying its
 * constraints and (recursively) the constraints of its children.
 */
export function resizeElement(el, oldW, oldH, newW, newH) {
  const c = el.constraints || defaultConstraints(el.type);
  const [x, w] = solveAxis(el.x, el.w, oldW, newW, c.h, 12);
  const [y, h] = solveAxis(el.y, el.h, oldH, newH, c.v, 8);
  const moved = x !== el.x || y !== el.y || w !== el.w || h !== el.h;
  const out = moved ? { ...el, x, y, w, h } : el;
  if (!isContainer(el) || !Array.isArray(el.children)) return out;
  const kids = el.children.map((child) => resizeElement(child, el.w, el.h, w, h));
  const kidsChanged = kids.some((child, i) => child !== el.children[i]);
  if (!moved && !kidsChanged) return el;
  return { ...out, children: kids };
}

function sameBox(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Stack children inside a container according to its layout. */
function layoutChildren(container) {
  const l = normalizeLayout(container.layout);
  if (!l || !Array.isArray(container.children)) return container.children;
  const kids = container.children;
  if (!kids.length) return kids;
  const p = l.padding;
  const row = l.direction === 'row';
  const innerW = Math.max(0, container.w - p.l - p.r);
  const innerH = Math.max(0, container.h - p.t - p.b);

  let next = kids;
  if (l.align === 'stretch') {
    next = kids.map((kid) => {
      const size = row ? innerH : innerW;
      const key = row ? 'h' : 'w';
      if (kid[key] === size) return kid;
      return { ...kid, [key]: Math.max(row ? 8 : 12, size) };
    });
  }

  // A stretched child changed size: its own auto layout must re-run.
  next = next.map((kid, i) => (kid !== kids[i] ? reflowElement(kid) : kid));

  const mainOf = (kid) => (row ? kid.w : kid.h);
  const crossOf = (kid) => (row ? kid.h : kid.w);
  const sum = next.reduce((acc, kid) => acc + mainOf(kid), 0);
  const innerMain = row ? innerW : innerH;
  const innerCross = row ? innerH : innerW;
  let gap = l.gap;
  let cursor = row ? p.l : p.t;
  if (l.justify === 'center') cursor += (innerMain - (sum + gap * (next.length - 1))) / 2;
  else if (l.justify === 'end') cursor += innerMain - (sum + gap * (next.length - 1));
  else if (l.justify === 'between' && next.length > 1) {
    gap = Math.max(0, (innerMain - sum) / (next.length - 1));
  }

  const placed = next.map((kid) => {
    let cross = row ? p.t : p.l;
    if (l.align === 'center') cross += (innerCross - crossOf(kid)) / 2;
    else if (l.align === 'end') cross += innerCross - crossOf(kid);
    const main = Math.round(cursor);
    cursor += mainOf(kid) + gap;
    const box = row ? { x: main, y: Math.round(cross) } : { x: Math.round(cross), y: main };
    if (kid.x === box.x && kid.y === box.y) return kid;
    return { ...kid, x: box.x, y: box.y };
  });
  const placedChanged = placed.some((kid, i) => kid !== next[i]);
  return placedChanged || next !== kids ? placed : kids;
}

/** Reflow one element subtree (children first, then this container). */
export function reflowElement(el) {
  if (!isContainer(el) || !Array.isArray(el.children)) return el;
  const kids = el.children.map(reflowElement);
  const kidsChanged = kids.some((kid, i) => kid !== el.children[i]);
  const base = kidsChanged ? { ...el, children: kids } : el;
  const laid = layoutChildren(base);
  if (laid === base.children) return base;
  return { ...base, children: laid };
}

export function reflowElements(elements) {
  const out = elements.map(reflowElement);
  return out.some((el, i) => el !== elements[i]) ? out : elements;
}

export function reflowPage(page) {
  const elements = reflowElements(page.elements || []);
  return elements === page.elements ? page : { ...page, elements };
}

export function reflowDoc(doc) {
  const pages = (doc.pages || []).map(reflowPage);
  return pages.some((page, i) => page !== doc.pages[i]) ? { ...doc, pages } : doc;
}

/**
 * Resize a page frame and resolve its content.
 * @param {'constraints'|'scale'|'none'} mode
 */
export function resizePage(page, newW, newH, mode) {
  const oldW = page.frame.w;
  const oldH = page.frame.h;
  const w = Math.max(1, Math.round(newW));
  const h = Math.max(1, Math.round(newH));
  let elements = page.elements;
  if (oldW !== w || oldH !== h) {
    if (mode === 'scale') {
      elements = scaleElementsInTree(elements, w / oldW, h / oldH, Math.min(w / oldW, h / oldH));
    } else if (mode === 'constraints') {
      elements = elements.map((el) => resizeElement(el, oldW, oldH, w, h));
    }
  }
  return reflowPage({ ...page, frame: { ...page.frame, w, h }, elements });
}
