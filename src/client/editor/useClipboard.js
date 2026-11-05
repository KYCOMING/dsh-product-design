/**
 * Internal clipboard for canvas elements. Stores absolute coordinates so a
 * paste into another page or container keeps the visual position.
 */

import { cloneElementDeep } from '../../shared/elements.js';
import { pasteElements } from '../domain/document.js';
import { useRef } from '../react.js';

export function useClipboard({ docRef, setDoc, setSelIds, getSelected, deleteSelection }) {
  const clipboardRef = useRef([]);

  function copySelection() {
    const entries = getSelected();
    if (!entries.length) return;
    clipboardRef.current = entries.map((entry) => ({
      el: cloneElementDeep(entry.el),
      absX: entry.absX,
      absY: entry.absY,
    }));
  }
  function cutSelection() {
    copySelection();
    deleteSelection();
  }
  function pasteClipboard() {
    const items = clipboardRef.current;
    if (!items.length) return;
    const doc = docRef.current;
    const page = doc.pages.find((candidate) => candidate.id === doc.activePageId);
    if (!page) return;
    const selected = getSelected();
    const target =
      selected.length === 1 && selected[0].el.type === 'container' ? selected[0] : null;
    let ids = [];
    setDoc((current) => {
      const out = pasteElements(current, page.id, items, target ? target.el.id : null);
      ids = out.ids;
      return out.doc;
    });
    if (ids.length) setSelIds(ids);
  }

  return { clipboardRef, copySelection, cutSelection, pasteClipboard };
}
