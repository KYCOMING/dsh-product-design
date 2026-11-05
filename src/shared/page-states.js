/**
 * Page state variants.
 *
 * A page state is a real page, not an overlay: it has its own element tree,
 * frame and name, and is linked from its base page:
 *
 *   base:    { id, name, frame, elements, states: { empty?: variantId, ... } }
 *   variant: { id, name, frame, elements, variantOf: baseId, stateKey: 'empty' }
 *
 * Keeping variants as pages means the whole editor (selection, drag, layers,
 * undo, AI ops) works on them without a parallel state-editing mode.
 */

import { cloneElementDeep } from './elements.js';
import { resizePage } from './layout.js';

export const PAGE_STATE_KEYS = ['loading', 'empty', 'error'];

let seq = 0;
function defaultId(prefix) {
  seq += 1;
  const rnd =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix + Date.now().toString(36) + seq.toString(36) + rnd;
}

export function isVariant(page) {
  return !!(page && page.variantOf && PAGE_STATE_KEYS.includes(page.stateKey));
}

export function normalizeStateLinks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of PAGE_STATE_KEYS) {
    if (typeof raw[key] === 'string' && raw[key]) out[key] = raw[key];
  }
  return out;
}

export function basePages(doc) {
  return (doc.pages || []).filter((page) => !isVariant(page));
}

export function basePageOf(doc, pageId) {
  const page = (doc.pages || []).find((candidate) => candidate.id === pageId);
  if (!page) return null;
  if (!isVariant(page)) return page;
  return (doc.pages || []).find((candidate) => candidate.id === page.variantOf) || null;
}

export function stateVariantsOf(doc, baseId) {
  return (doc.pages || []).filter(
    (page) => page.variantOf === baseId && PAGE_STATE_KEYS.includes(page.stateKey),
  );
}

export function statePageId(doc, baseId, key) {
  const base = (doc.pages || []).find((page) => page.id === baseId);
  const id = base && base.states ? base.states[key] : '';
  if (!id) return '';
  const page = (doc.pages || []).find((candidate) => candidate.id === id);
  return page && page.variantOf === baseId && page.stateKey === key ? id : '';
}

/** Drop links that no longer point at a matching variant, and demote orphans. */
export function repairPageStates(doc) {
  const pages = doc.pages || [];
  const byId = new Map(pages.map((page) => [page.id, page]));
  for (const page of pages) {
    if (!page.variantOf) continue;
    const base = byId.get(page.variantOf);
    if (!base || !PAGE_STATE_KEYS.includes(page.stateKey)) {
      delete page.variantOf;
      delete page.stateKey;
      page.states = {};
    }
  }
  for (const page of pages) {
    if (page.variantOf) {
      page.states = {};
      continue;
    }
    const links = normalizeStateLinks(page.states);
    const valid = {};
    for (const key of PAGE_STATE_KEYS) {
      const target = links[key] ? byId.get(links[key]) : null;
      if (target && target.variantOf === page.id && target.stateKey === key) {
        valid[key] = target.id;
      }
    }
    page.states = valid;
  }
  for (const page of pages) {
    if (!page.variantOf) continue;
    const base = byId.get(page.variantOf);
    if (!base) continue;
    if (base.states[page.stateKey] && base.states[page.stateKey] !== page.id) {
      delete page.variantOf;
      delete page.stateKey;
      page.states = {};
      continue;
    }
    base.states[page.stateKey] = page.id;
  }
  return doc;
}

/** Create (or reuse) the variant page for one state key. */
export function addStateVariant(doc, pageId, key, options = {}) {
  if (!PAGE_STATE_KEYS.includes(key)) return { doc, pageId: '', created: false };
  const base = basePageOf(doc, pageId);
  if (!base) return { doc, pageId: '', created: false };
  const existing = statePageId(doc, base.id, key);
  if (existing) return { doc, pageId: existing, created: false };
  const id = options.id || defaultId;
  const variant = {
    id: id('p'),
    name: options.name || `${base.name} · ${key}`,
    frame: { ...base.frame },
    states: {},
    variantOf: base.id,
    stateKey: key,
    elements: cloneElementDeep(
      { id: 'root', type: 'group', x: 0, y: 0, w: 0, h: 0, children: base.elements || [] },
      () => id('e'),
    ).children,
  };
  const pages = doc.pages.filter((page) => !(page.variantOf === base.id && page.stateKey === key));
  let at = pages.findIndex((page) => page.id === base.id) + 1;
  while (at < pages.length && pages[at].variantOf === base.id) at += 1;
  pages.splice(at, 0, variant);
  const next = pages.map((page) =>
    page.id === base.id ? { ...page, states: { ...(page.states || {}), [key]: variant.id } } : page,
  );
  return {
    doc: { ...doc, pages: next, activePageId: variant.id },
    pageId: variant.id,
    created: true,
  };
}

/** Remove one state variant and its link. */
export function removeStateVariant(doc, pageId, key) {
  const base = basePageOf(doc, pageId);
  if (!base) return { doc, removedId: '' };
  let id = statePageId(doc, base.id, key);
  if (!id) {
    const orphan = doc.pages.find((page) => page.variantOf === base.id && page.stateKey === key);
    id = orphan ? orphan.id : '';
  }
  if (!id) return { doc, removedId: '' };
  const pages = doc.pages
    .filter((page) => page.id !== id)
    .map((page) => {
      if (page.id !== base.id) return page;
      const states = { ...(page.states || {}) };
      delete states[key];
      return { ...page, states };
    });
  const activePageId = doc.activePageId === id ? base.id : doc.activePageId;
  return { doc: { ...doc, pages, activePageId }, removedId: id };
}

/** Delete a page, including the whole family when it is a base page. */
export function removePageDeep(doc, pageId) {
  const page = (doc.pages || []).find((candidate) => candidate.id === pageId);
  if (!page) return doc;
  const base = page.variantOf ? basePageOf(doc, pageId) : page;
  const family = base ? [base.id, ...stateVariantsOf(doc, base.id).map((item) => item.id)] : [];
  const removing = new Set(page.variantOf ? [pageId] : family.length ? family : [pageId]);
  const remaining = doc.pages.filter((candidate) => !removing.has(candidate.id));
  if (!remaining.some((candidate) => !isVariant(candidate))) return doc;
  let activePageId = doc.activePageId;
  if (removing.has(activePageId)) {
    activePageId = base && !removing.has(base.id) ? base.id : remaining[0]?.id || null;
  }
  const pages = remaining.map((candidate) => {
    if (!base || candidate.id !== base.id) return candidate;
    const states = { ...(candidate.states || {}) };
    for (const key of PAGE_STATE_KEYS) {
      if (states[key] && removing.has(states[key])) delete states[key];
    }
    return { ...candidate, states };
  });
  return { ...doc, pages, activePageId };
}

/** Duplicate a base page together with every state variant. */
export function duplicatePageDeep(doc, pageId, options = {}) {
  const source = (doc.pages || []).find((candidate) => candidate.id === pageId);
  if (!source) return doc;
  const base = source.variantOf ? basePageOf(doc, pageId) : source;
  if (!base) return doc;
  const variants = stateVariantsOf(doc, base.id);
  const id = options.id || defaultId;
  const suffix = options.suffix || 'copy';
  const pageIdMap = new Map();
  pageIdMap.set(base.id, id('p'));
  for (const variant of variants) pageIdMap.set(variant.id, id('p'));

  const clonePage = (page, extra) => {
    const copy = {
      ...page,
      id: pageIdMap.get(page.id),
      name: page.id === base.id ? `${page.name} ${suffix}` : page.name,
      frame: { ...page.frame },
      states: {},
      elements: cloneElementDeep(
        { id: 'root', type: 'group', x: 0, y: 0, w: 0, h: 0, children: page.elements || [] },
        () => id('e'),
      ).children,
      ...extra,
    };
    if (!extra) {
      delete copy.variantOf;
      delete copy.stateKey;
    }
    return copy;
  };

  const baseCopy = clonePage(base);
  baseCopy.states = {};
  const copies = [baseCopy];
  for (const variant of variants) {
    const copy = clonePage(variant, { variantOf: baseCopy.id, stateKey: variant.stateKey });
    baseCopy.states[variant.stateKey] = copy.id;
    copies.push(copy);
  }

  // Interactions that pointed inside the family should follow the copies.
  const remap = (elements) => {
    for (const el of elements) {
      if (Array.isArray(el.interactions)) {
        el.interactions = el.interactions.map((link) =>
          link.targetPageId && pageIdMap.has(link.targetPageId)
            ? { ...link, targetPageId: pageIdMap.get(link.targetPageId) }
            : link,
        );
      }
      if (Array.isArray(el.children)) remap(el.children);
    }
  };
  for (const copy of copies) remap(copy.elements);

  const pages = doc.pages.slice();
  const lastIndex = Math.max(
    ...[base, ...variants].map((page) => pages.findIndex((item) => item.id === page.id)),
  );
  pages.splice(lastIndex + 1, 0, ...copies);
  return { ...doc, pages, activePageId: baseCopy.id };
}

/** Resize every page in a state family so variants keep the base frame. */
export function resizePageFamily(doc, pageId, width, height, mode, preset) {
  const base = basePageOf(doc, pageId);
  if (!base) return doc;
  const family = new Set([base.id, ...stateVariantsOf(doc, base.id).map((page) => page.id)]);
  const pages = doc.pages.map((page) => {
    if (!family.has(page.id)) return page;
    const resized = resizePage(page, width, height, mode);
    return preset ? { ...resized, frame: { ...resized.frame, preset } } : resized;
  });
  return { ...doc, pages };
}
