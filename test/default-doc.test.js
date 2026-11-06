import { describe, expect, it } from 'vitest';
import { defaultDoc } from '../src/client/model.js';

describe('默认设计稿', () => {
  it('新稿默认没有页面（空白画布），不预置画板与示例元素', () => {
    const d = defaultDoc();
    expect(d.pages).toEqual([]);
    expect(d.activePageId).toBe(null);
    expect(d.name).toBe('');
  });
});
