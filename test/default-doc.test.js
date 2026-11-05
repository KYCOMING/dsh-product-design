import { describe, expect, it } from 'vitest';
import { defaultDoc } from '../src/client/model.js';

describe('默认设计稿', () => {
  it('新稿只有一页空白画板，不含示例 / 欢迎元素', () => {
    const d = defaultDoc(null);
    expect(d.pages).toHaveLength(1);
    expect(d.pages[0].elements).toEqual([]);
    expect(d.activePageId).toBe(d.pages[0].id);
    expect(d.pages[0].frame).toMatchObject({ w: 390, h: 844, preset: 'mobile' });
  });
});
