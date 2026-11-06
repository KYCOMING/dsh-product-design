/** Pure helpers shared by the canvas gesture handlers. */
import { collectElementEntries } from '../../shared/elements.js';

/** True when a keyboard event target is an editable control (space should type). */
export function isEditableTarget(tgt) {
  const tag = (tgt && tgt.tagName) || '';
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A' ||
    !!(tgt && tgt.isContentEditable)
  );
}

/** Snap targets: the artboard frame plus every other element's absolute box. */
export function snapTargets(page, excludeIds) {
  const targets = [{ x: 0, y: 0, w: page.frame.w, h: page.frame.h, id: '__frame__' }];
  for (const entry of collectElementEntries(page.elements)) {
    if (excludeIds.has(entry.el.id)) continue;
    targets.push({ id: entry.el.id, x: entry.absX, y: entry.absY, w: entry.w, h: entry.h });
  }
  return targets;
}
