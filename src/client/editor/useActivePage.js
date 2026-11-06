/** Switching the active page prunes the selection to same-page elements. */
import { findElementEntry } from '../../shared/elements.js';
import { useCallback } from '../react.js';

export function useActivePage({ docRef, setDoc, setEditing, setHoverId, setSelIds }) {
  return useCallback(
    (id) => {
      setEditing(null);
      setHoverId(null);
      setSelIds((ids) => {
        const page = docRef.current.pages.find((candidate) => candidate.id === id);
        if (!page) return [];
        const kept = ids.filter((item) => !!findElementEntry(page.elements, item));
        return kept.length === ids.length ? ids : kept;
      });
      setDoc(
        (current) => (current.activePageId === id ? current : { ...current, activePageId: id }),
        false,
      );
    },
    [docRef, setDoc, setSelIds, setEditing, setHoverId],
  );
}
