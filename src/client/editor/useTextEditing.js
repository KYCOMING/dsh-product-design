/**
 * Inline text editing: one element at a time, committed on Enter / blur.
 */

import { setElementText } from '../domain/document.js';
import { useRef, useState } from '../react.js';

export function useTextEditing({ setDoc }) {
  const [editing, setEditing] = useState(null); // { id, value }
  const editingRef = useRef(null);
  editingRef.current = editing;

  function startTextEdit(id, value) {
    setEditing({ id, value });
  }
  function changeText(id, value) {
    setEditing((current) => (current && current.id === id ? { id, value } : current));
  }
  function commitText() {
    const current = editingRef.current;
    setEditing(null);
    if (!current) return;
    setDoc((doc) => setElementText(doc, current.id, current.value));
  }
  function cancelText() {
    setEditing(null);
  }

  return { editing, setEditing, editingRef, startTextEdit, changeText, commitText, cancelText };
}
