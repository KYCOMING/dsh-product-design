import { describe, expect, it } from 'vitest';
import { applyOps, emptyDoc, summarizeDoc } from '../src/host/model.js';

describe('host 容器 / 编组', () => {
  it('add_container + add_element(containerId) 形成嵌套树', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page', name: 'P' },
      { kind: 'add_container', x: 20, y: 20, w: 300, h: 200, name: '卡片' },
    ]);
    const pageId = first.doc.pages[0].id;
    const containerId = first.results[1].elementId;
    const second = applyOps(first.doc, [
      {
        kind: 'add_element',
        pageId,
        containerId,
        type: 'button',
        x: 12,
        y: 16,
        w: 100,
        h: 40,
        props: { text: '确定' },
      },
    ]);
    const box = second.doc.pages[0].elements[0];
    expect(box.type).toBe('container');
    expect(box.children).toHaveLength(1);
    expect(box.children[0]).toMatchObject({ type: 'button', x: 12, y: 16 });
    expect(box.children[0].props.text).toBe('确定');
    expect(summarizeDoc(second.doc).pages[0]).toMatchObject({ elements: 2, containers: 1 });
  });

  it('同一次 apply 内可用 @last 指向刚建的容器', () => {
    const { doc } = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      { kind: 'add_container', name: '外层' },
      { kind: 'add_container', containerId: '@last', name: '内层' },
      { kind: 'add_element', containerId: '@last', type: 'badge', props: { text: 'NEW' } },
    ]);
    const outer = doc.pages[0].elements[0];
    expect(outer.children).toHaveLength(1);
    const inner = outer.children[0];
    expect(inner.type).toBe('container');
    expect(inner.children[0]).toMatchObject({ type: 'badge', props: { text: 'NEW' } });
  });

  it('update/delete 可递归定位容器内元素', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      { kind: 'add_container', name: 'C' },
    ]);
    const containerId = first.results[1].elementId;
    const pageId = first.doc.pages[0].id;
    const second = applyOps(first.doc, [
      { kind: 'add_element', pageId, containerId, type: 'text', props: { text: '旧' } },
    ]);
    const childId = second.doc.pages[0].elements[0].children[0].id;
    const third = applyOps(second.doc, [
      { kind: 'update_element', pageId, elementId: childId, props: { text: '新' } },
    ]);
    expect(third.doc.pages[0].elements[0].children[0].props.text).toBe('新');
    const fourth = applyOps(third.doc, [{ kind: 'delete_element', pageId, elementId: childId }]);
    expect(fourth.doc.pages[0].elements[0].children).toHaveLength(0);
  });

  it('group_elements / ungroup_elements 保持坐标', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      { kind: 'add_element', type: 'text', x: 10, y: 20, w: 50, h: 20 },
      { kind: 'add_element', type: 'text', x: 120, y: 20, w: 50, h: 20 },
    ]);
    const pageId = first.doc.pages[0].id;
    const ids = first.doc.pages[0].elements.map((e) => e.id);
    const grouped = applyOps(first.doc, [{ kind: 'group_elements', pageId, elementIds: ids }]);
    const group = grouped.doc.pages[0].elements[0];
    expect(group.type).toBe('group');
    expect(group.children.map((e) => e.x)).toEqual([0, 110]);
    const ungrouped = applyOps(grouped.doc, [
      { kind: 'ungroup_elements', pageId, elementId: group.id },
    ]);
    expect(ungrouped.doc.pages[0].elements.map((e) => [e.x, e.y])).toEqual([
      [10, 20],
      [120, 20],
    ]);
  });

  it('set_page_frame 默认约束：容器左右拉伸，子元素按自身约束重排', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page', preset: 'mobile' },
      {
        kind: 'add_container',
        x: 24,
        y: 24,
        w: 342,
        h: 200,
        constraints: { h: 'leftRight', v: 'top' },
      },
    ]);
    const pageId = first.doc.pages[0].id;
    const containerId = first.results[1].elementId;
    const second = applyOps(first.doc, [
      {
        kind: 'add_element',
        pageId,
        containerId,
        type: 'text',
        x: 10,
        y: 10,
        w: 50,
        h: 20,
        constraints: { h: 'left', v: 'top' },
      },
    ]);
    const resized = applyOps(second.doc, [
      { kind: 'set_page_frame', pageId, preset: 'desktop' },
    ]).doc;
    const box = resized.pages[0].elements[0];
    expect(box.w).toBe(1280 - 24 - 24);
    expect(box.children[0]).toMatchObject({ x: 10, y: 10, w: 50, h: 20 });
  });

  it('set_page_frame resizeMode:scale 会同步缩放容器与子元素', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page', preset: 'desktop' },
      { kind: 'add_container', x: 100, y: 100, w: 200, h: 100 },
    ]);
    const pageId = first.doc.pages[0].id;
    const containerId = first.results[1].elementId;
    const second = applyOps(first.doc, [
      { kind: 'add_element', pageId, containerId, type: 'text', x: 10, y: 10, w: 50, h: 20 },
    ]);
    const scaled = applyOps(second.doc, [
      { kind: 'set_page_frame', pageId, preset: 'mobile', resizeMode: 'scale' },
    ]).doc;
    const box = scaled.pages[0].elements[0];
    const sx = 390 / 1280;
    expect(box.w).toBe(Math.max(12, Math.round(200 * sx)));
    expect(box.children[0].w).toBe(Math.max(12, Math.round(50 * sx)));
  });

  it('删除容器会连同子元素一起删除', () => {
    const first = applyOps(emptyDoc(), [{ kind: 'add_page' }, { kind: 'add_container' }]);
    const pageId = first.doc.pages[0].id;
    const containerId = first.results[1].elementId;
    const second = applyOps(first.doc, [
      { kind: 'add_element', pageId, containerId, type: 'text' },
    ]);
    const third = applyOps(second.doc, [
      { kind: 'delete_element', pageId, elementId: containerId },
    ]);
    expect(third.doc.pages[0].elements).toHaveLength(0);
  });
});
