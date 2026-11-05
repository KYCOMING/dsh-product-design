/**
 * Global keyboard shortcuts. Kept in a ref reassigned every render so the
 * handler always closes over the latest state and actions.
 */

import { useEffect, useRef } from '../react.js';

export function useKeyboardShortcuts(actions) {
  const {
    preview,
    editingRef,
    ctxMenu,
    setEditing,
    setCtxMenu,
    selIds,
    setSelIds,
    undo,
    redo,
    groupSelection,
    ungroupSelection,
    duplicateSelection,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    nudgeSelected,
    reorderSelection,
    onEscapePreview,
  } = actions;

  // Global keyboard shortcuts. Kept in a ref reassigned every render so the
  // handler always closes over the latest state / functions.
  const keyHandlerRef = useRef(null);
  keyHandlerRef.current = (e) => {
    const tgt = e.target;
    const tag = (tgt && tgt.tagName) || '';
    const editable =
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tgt && tgt.isContentEditable);
    if (editable) {
      if (e.key === 'Escape') tgt.blur();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    if (mod && !e.shiftKey && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && e.shiftKey && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && (k === 'y' || k === 'Y')) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && !e.shiftKey && (k === 'g' || k === 'G')) {
      e.preventDefault();
      groupSelection();
      return;
    }
    if (mod && e.shiftKey && (k === 'g' || k === 'G')) {
      e.preventDefault();
      ungroupSelection();
      return;
    }
    if (mod && (k === 'd' || k === 'D')) {
      e.preventDefault();
      duplicateSelection();
      return;
    }
    if (mod && !e.shiftKey && (k === 'c' || k === 'C')) {
      e.preventDefault();
      copySelection();
      return;
    }
    if (mod && !e.shiftKey && (k === 'x' || k === 'X')) {
      e.preventDefault();
      cutSelection();
      return;
    }
    if (mod && !e.shiftKey && (k === 'v' || k === 'V')) {
      e.preventDefault();
      pasteClipboard();
      return;
    }
    if (mod && (k === ']' || k === '}')) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? 'front' : 'forward');
      return;
    }
    if (mod && (k === '[' || k === '{')) {
      e.preventDefault();
      reorderSelection(e.shiftKey ? 'back' : 'backward');
      return;
    }
    if (k === 'Escape') {
      if (editingRef.current) {
        setEditing(null);
        return;
      }
      if (ctxMenu) {
        setCtxMenu(null);
        return;
      }
      if (preview) onEscapePreview();
      else setSelIds([]);
      return;
    }
    if (preview) return;
    if (!selIds.length) return;
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      deleteSelection();
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0;
      const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
      nudgeSelected(dx, dy);
    }
  };
  useEffect(() => {
    const fn = (e) => keyHandlerRef.current(e);
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
}
