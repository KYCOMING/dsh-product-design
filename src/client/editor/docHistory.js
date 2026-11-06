/**
 * Pure undo/redo history primitives for useDocument.
 *
 * The hook owns the `{ past, future }` container and the coalescing key; these
 * functions hold the algorithm so it is unit-testable and the hook stays about
 * state wiring, not history bookkeeping.
 */

export const HIST_LIMIT = 120;

/** Push a "before" snapshot and clear the redo stack. */
export function pushSnapshot(hist, snapshot) {
  hist.past.push(snapshot);
  if (hist.past.length > HIST_LIMIT) hist.past.shift();
  hist.future = [];
}

/**
 * Record a "before" snapshot for an edit, coalescing rapid same-key edits
 * (e.g. typing in one field) within 900ms. `mode === false` is handled by the
 * caller (no recording at all). Returns true when a snapshot was pushed.
 */
export function recordEdit(hist, lastKey, prev, mode) {
  let record = true;
  if (typeof mode === 'string') {
    const now = Date.now();
    if (lastKey.key === mode && now - lastKey.time < 900) record = false;
    lastKey.key = mode;
    lastKey.time = now;
  } else {
    lastKey.key = null;
    lastKey.time = 0;
  }
  if (record) pushSnapshot(hist, prev);
  return record;
}

/** Pop the previous snapshot; `current` goes onto the redo stack. */
export function undoStep(hist, current) {
  if (!hist.past.length) return null;
  const prev = hist.past.pop();
  hist.future.push(current);
  return prev;
}

/** Pop the next redo snapshot; `current` goes back onto the past stack. */
export function redoStep(hist, current) {
  if (!hist.future.length) return null;
  const next = hist.future.pop();
  hist.past.push(current);
  if (hist.past.length > HIST_LIMIT) hist.past.shift();
  return next;
}
