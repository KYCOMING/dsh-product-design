import { describe, expect, it } from 'vitest';
import { snapMoveBox, snapResizeBox } from '../src/shared/snapping.js';

describe('磁吸几何', () => {
  const frame = { id: '__frame__', x: 0, y: 0, w: 400, h: 300 };
  const sibling = { id: 's1', x: 240, y: 100, w: 60, h: 60 };

  it('拖动时吸附到最近边缘并返回参考线', () => {
    const box = { x: 185, y: 100, w: 50, h: 50 };
    const out = snapMoveBox(box, [frame, sibling], 5);
    expect(out.dx).toBe(5); // right edge 235 → sibling left 240
    expect(out.dy).toBe(0); // top edge already aligns with sibling/frame 100
    expect(out.guides.some((g) => g.axis === 'x' && g.pos === 240)).toBe(true);
    expect(out.guides.some((g) => g.axis === 'y' && g.pos === 100)).toBe(true);
  });

  it('拖动时吸附到画板中心线', () => {
    const box = { x: 170, y: 120, w: 60, h: 60 };
    // 中心 200 == 画板中心 200；y 顶边 120，画板中心 150 不在阈值内
    const out = snapMoveBox(box, [frame], 5);
    expect(out.dx).toBe(0);
    expect(out.guides.some((g) => g.axis === 'x' && g.pos === 200)).toBe(true);
  });

  it('超过阈值不吸附', () => {
    const box = { x: 10, y: 10, w: 20, h: 20 };
    const out = snapMoveBox(box, [{ id: 'far', x: 100, y: 100, w: 20, h: 20 }], 5);
    expect(out.dx).toBe(0);
    expect(out.dy).toBe(0);
    expect(out.guides).toHaveLength(0);
  });

  it('缩放右边缘时吸附到相邻元素左边', () => {
    const box = { x: 100, y: 100, w: 48, h: 50 };
    const neighbor = { id: 's2', x: 150, y: 0, w: 60, h: 200 };
    const out = snapResizeBox(box, 'e', [neighbor], 5);
    expect(out.box.w).toBe(50); // right 148 → 150 = neighbor left
    expect(out.guides.some((g) => g.axis === 'x' && g.pos === 150)).toBe(true);
  });

  it('缩放左边缘时同步移动 x 并保持宽度', () => {
    const box = { x: 102, y: 100, w: 100, h: 50 };
    const target = { id: 's2', x: 100, y: 80, w: 60, h: 60 };
    const out = snapResizeBox(box, 'w', [target], 5);
    expect(out.box.x).toBe(100);
    expect(out.box.w).toBe(102);
  });
});
