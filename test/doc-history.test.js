import { describe, expect, it } from 'vitest';
import { pushSnapshot, recordEdit, redoStep, undoStep } from '../src/client/editor/docHistory.js';

describe('docHistory 纯逻辑（P1-7）', () => {
  it('push / undo / redo 栈行为正确', () => {
    const h = { past: [], future: [] };
    pushSnapshot(h, { v: 1 });
    pushSnapshot(h, { v: 2 });
    expect(h.past.map((s) => s.v)).toEqual([1, 2]);
    const prev = undoStep(h, { v: 3 });
    expect(prev).toEqual({ v: 2 });
    expect(h.future).toEqual([{ v: 3 }]);
    const next = redoStep(h, { v: 2 });
    expect(next).toEqual({ v: 3 });
    expect(h.past.map((s) => s.v)).toEqual([1, 2]);
  });

  it('push 会清空 redo 栈', () => {
    const h = { past: [{ v: 1 }], future: [{ v: 9 }] };
    pushSnapshot(h, { v: 2 });
    expect(h.future).toEqual([]);
  });

  it('recordEdit 对同一 key 在 900ms 内合并、不同 key 记录', () => {
    const h = { past: [], future: [] };
    const lastKey = { key: null, time: 0 };
    expect(recordEdit(h, lastKey, { v: 1 }, 'text:1')).toBe(true);
    expect(recordEdit(h, lastKey, { v: 2 }, 'text:1')).toBe(false);
    expect(recordEdit(h, lastKey, { v: 3 }, 'w:1')).toBe(true);
    expect(h.past.map((s) => s.v)).toEqual([1, 3]);
  });
});
