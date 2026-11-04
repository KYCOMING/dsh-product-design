import { describe, expect, it } from 'vitest';
import { applyOps, emptyDoc, ensureDoc, summarizeDoc } from '../src/host/model.js';

describe('host 文档 reducer', () => {
  it('add_page + add_element 生成 id 并保持结构', () => {
    const { doc, results } = applyOps(emptyDoc(), [
      { kind: 'add_page', name: '登录', preset: 'mobile' },
      { kind: 'add_element', type: 'button', props: { text: '登录' } },
    ]);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].name).toBe('登录');
    expect(doc.pages[0].frame).toMatchObject({ w: 390, h: 844, preset: 'mobile' });
    expect(doc.pages[0].elements).toHaveLength(1);
    expect(results[0].pageId).toBe(doc.pages[0].id);
    expect(results[1].elementId).toBe(doc.pages[0].elements[0].id);
    expect(doc.pages[0].elements[0].props.text).toBe('登录');
    expect(doc.activePageId).toBe(doc.pages[0].id);
  });

  it('update_element 合并 props 并 clamp 尺寸', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      { kind: 'add_element', type: 'text' },
    ]);
    const pageId = doc.pages[0].id;
    const elId = doc.pages[0].elements[0].id;
    const out = applyOps(doc, [
      {
        kind: 'update_element',
        pageId,
        elementId: elId,
        x: 10,
        w: 1,
        props: { text: 'Hi', color: '#f00' },
      },
    ]).doc;
    const el = out.pages[0].elements[0];
    expect(el.x).toBe(10);
    expect(el.w).toBe(12); // clamped to minimum
    expect(el.props.text).toBe('Hi');
    expect(el.props.color).toBe('#f00');
  });

  it('非法操作抛出明确错误', () => {
    expect(() => applyOps(emptyDoc(), [])).toThrow(/not be empty/);
    expect(() => applyOps(emptyDoc(), [{ kind: 'nope' }])).toThrow(/unknown kind/);
    expect(() => applyOps(emptyDoc(), [{ kind: 'add_element', type: 'button' }])).toThrow(
      /add a page/,
    );
    const { doc } = applyOps(emptyDoc(), [{ kind: 'add_page' }]);
    expect(() => applyOps(doc, [{ kind: 'delete_page', pageId: doc.pages[0].id }])).toThrow(
      /last page/,
    );
  });

  it('ensureDoc 丢弃脏数据并补齐默认值', () => {
    const doc = ensureDoc({
      pages: [{ name: 'x', frame: { preset: 'tablet' }, elements: [null, { type: 'unknown' }] }],
    });
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].frame).toMatchObject({ w: 768, h: 1024, preset: 'tablet' });
    expect(doc.pages[0].elements).toHaveLength(1);
    expect(doc.pages[0].elements[0].type).toBe('text');
    expect(doc.activePageId).toBe(doc.pages[0].id);
  });

  it('summarizeDoc 输出页面摘要', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'A' },
      { kind: 'add_element', type: 'card' },
    ]);
    const summary = summarizeDoc(doc);
    expect(summary.pages[0]).toMatchObject({ name: 'A', frame: '390×844', elements: 1 });
  });

  it('支持 @last 与 pageIndex 定位同批次新建页面', () => {
    const { doc, results } = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'P1' },
      { kind: 'add_element', type: 'text', props: { text: 'on first' } },
      { kind: 'add_page', name: 'P2' },
      { kind: 'add_element', pageId: '@last', type: 'button', props: { text: 'on last' } },
      { kind: 'add_element', pageIndex: 0, type: 'badge', props: { text: 'A' } },
    ]);
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[0].elements.map((e) => e.props.text)).toEqual(['on first', 'A']);
    expect(doc.pages[1].elements.map((e) => e.props.text)).toEqual(['on last']);
    expect(results[3].pageId).toBe(doc.pages[1].id);
  });

  it('set_page_frame 切换尺寸时按宽高分别缩放（可还原、可关闭）', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page', preset: 'desktop' },
      {
        kind: 'add_element',
        type: 'button',
        x: 200,
        y: 100,
        w: 200,
        h: 60,
        props: { fontSize: 20, radius: 10 },
      },
    ]);
    const pageId = doc.pages[0].id;
    const before = doc.pages[0].elements[0];

    const shrunk = applyOps(doc, [{ kind: 'set_page_frame', pageId, preset: 'mobile' }]).doc;
    const after = shrunk.pages[0].elements[0];
    expect(shrunk.pages[0].frame).toMatchObject({ w: 390, h: 844, preset: 'mobile' });
    const sx = 390 / 1280;
    const sy = 844 / 800;
    const sf = Math.min(sx, sy);
    expect(after.w).toBe(Math.max(12, Math.round(before.w * sx)));
    expect(after.h).toBe(Math.max(8, Math.round(before.h * sy)));
    expect(after.x).toBe(Math.round(before.x * sx));
    expect(after.y).toBe(Math.round(before.y * sy));
    expect(after.props.fontSize).toBe(Math.max(8, Math.round(before.props.fontSize * sf)));

    // 切回桌面应还原（四舍五入误差内）
    const restored = applyOps(shrunk, [{ kind: 'set_page_frame', pageId, preset: 'desktop' }]).doc;
    expect(Math.abs(restored.pages[0].elements[0].w - before.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(restored.pages[0].elements[0].h - before.h)).toBeLessThanOrEqual(1);

    const kept = applyOps(doc, [
      { kind: 'set_page_frame', pageId, preset: 'mobile', scaleElements: false },
    ]).doc;
    expect(kept.pages[0].elements[0].w).toBe(before.w);
  });
});
