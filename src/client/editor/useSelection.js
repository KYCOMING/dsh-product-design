/**
 * Selection state and selection-scoped document edits.
 */

import {
  boundsOfEntries,
  collectElementEntries,
  findElementEntry,
  isUnderAny,
} from '../../shared/elements.js';
import { moveElementsBy, patchElements } from '../domain/document.js';
import { useCallback, useState } from '../react.js';

export function useSelection({ setDoc, activePage }) {
  const [selIds, setSelIds] = useState([]);
  const [hoverId, setHoverId] = useState(null);

  const treeEntries = activePage ? collectElementEntries(activePage.elements) : [];
  const entryById = new Map(treeEntries.map((entry) => [entry.el.id, entry]));
  const selEntries = selIds.map((id) => entryById.get(id)).filter(Boolean);
  const sel = selEntries.length === 1 ? selEntries[0].el : null;
  const selBoxes = selEntries.map((entry) => ({
    id: entry.el.id,
    x: entry.absX,
    y: entry.absY,
    w: entry.w,
    h: entry.h,
  }));
  const multiBounds = selEntries.length > 1 ? boundsOfEntries(selEntries) : null;

  const topSelectedEntries = useCallback(
    () => selEntries.filter((entry) => !isUnderAny(entry, selIds)),
    [selEntries, selIds],
  );

  const selectOnly = useCallback((id) => setSelIds(id ? [id] : []), []);

  function mapSelection(fn, mode) {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length || !activePage) return;
    setDoc((current) => patchElements(current, activePage.id, ids, fn), mode);
  }
  function applyAttrs(patch, mode) {
    mapSelection((el) => ({ ...el, ...patch }), mode);
  }
  function applyProps(patch, mode) {
    mapSelection((el) => ({ ...el, props: { ...el.props, ...patch } }), mode);
  }

  function nudgeSelected(dx, dy) {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length || !activePage) return;
    setDoc(
      (current) => moveElementsBy(current, activePage.id, ids, dx, dy),
      'nudge:' + ids.join(','),
    );
  }

  /** Drop selection ids that no longer exist (after a remote change). */
  function pruneSelection(nextDoc) {
    setSelIds((ids) =>
      ids.filter((id) => nextDoc.pages.some((page) => !!findElementEntry(page.elements, id))),
    );
  }

  return {
    selIds,
    setSelIds,
    selectOnly,
    hoverId,
    setHoverId,
    entryById,
    selEntries,
    sel,
    selBoxes,
    multiBounds,
    topSelectedEntries,
    applyAttrs,
    applyProps,
    nudgeSelected,
    pruneSelection,
  };
}
