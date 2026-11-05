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

  it('set_page_frame 只改画板尺寸，不动元素几何', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page', preset: 'desktop' },
      { kind: 'add_element', type: 'button', x: 200, y: 100, w: 200, h: 60 },
    ]);
    const pageId = doc.pages[0].id;
    const before = doc.pages[0].elements[0];
    const out = applyOps(doc, [{ kind: 'set_page_frame', pageId, preset: 'mobile' }]).doc;
    expect(out.pages[0].frame).toMatchObject({ w: 390, h: 844, preset: 'mobile' });
    expect(out.pages[0].elements[0]).toMatchObject({
      x: before.x,
      y: before.y,
      w: before.w,
      h: before.h,
    });
  });

  it('duplicate_page 深拷贝并分配新 id', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'A' },
      { kind: 'add_element', type: 'button', props: { text: 'ok' } },
    ]);
    const pageId = first.doc.pages[0].id;
    const out = applyOps(first.doc, [{ kind: 'duplicate_page', pageId, name: 'B' }]);
    expect(out.doc.pages).toHaveLength(2);
    expect(out.doc.pages[1].name).toBe('B');
    expect(out.doc.pages[1].elements[0].id).not.toBe(out.doc.pages[0].elements[0].id);
    expect(out.doc.pages[1].elements[0].props.text).toBe('ok');
  });

  it('move_element / reorder_element 保持屏幕位置与层级', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      { kind: 'add_container', x: 40, y: 40, w: 300, h: 200, name: 'C' },
      { kind: 'add_element', type: 'button', x: 60, y: 60, w: 100, h: 40 },
    ]);
    const pageId = first.doc.pages[0].id;
    const containerId = first.doc.pages[0].elements[0].id;
    const buttonId = first.doc.pages[0].elements[1].id;
    const moved = applyOps(first.doc, [
      { kind: 'move_element', pageId, elementId: buttonId, containerId },
    ]).doc;
    const box = moved.pages[0].elements[0];
    expect(box.children).toHaveLength(1);
    // absolute position is preserved: 60-40 = 20
    expect(box.children[0]).toMatchObject({ x: 20, y: 20 });
    const reordered = applyOps(moved, [
      { kind: 'reorder_element', pageId, elementId: box.children[0].id, position: 'front' },
    ]).doc;
    expect(reordered.pages[0].elements[0].children).toHaveLength(1);
  });

  it('add_page 后未指定 pageId 的元素落在新页', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'A' },
      { kind: 'add_element', type: 'text', props: { text: 'on A' } },
      { kind: 'add_page', name: 'B' },
      { kind: 'add_element', type: 'card', props: { text: 'on B' } },
    ]);
    expect(doc.pages[0].elements).toHaveLength(1);
    expect(doc.pages[1].elements).toHaveLength(1);
    expect(doc.pages[1].elements[0].type).toBe('card');
    expect(doc.activePageId).toBe(doc.pages[1].id);
  });

  it('按 elementId 操作时可跨页定位，无需 pageId', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'A' },
      { kind: 'add_element', type: 'button', props: { text: 'go' } },
      { kind: 'add_page', name: 'B' },
    ]);
    const buttonId = doc.pages[0].elements[0].id;
    const out = applyOps(doc, [
      { kind: 'update_element', elementId: buttonId, props: { text: 'changed' } },
    ]).doc;
    expect(out.pages[0].elements[0].props.text).toBe('changed');
    expect(out.pages[1].elements).toHaveLength(0);
  });

  it('set_page_states 写入可编辑的状态文案', () => {
    const { doc } = applyOps(emptyDoc(), [{ kind: 'add_page' }]);
    const pageId = doc.pages[0].id;
    const out = applyOps(doc, [
      { kind: 'set_page_states', pageId, states: { empty: { title: '还没有项目' } } },
    ]).doc;
    expect(out.pages[0].states.empty.title).toBe('还没有项目');
    expect(out.pages[0].states.empty.desc).toBe('');
  });
});
