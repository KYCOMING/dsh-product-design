import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;
let plugin;

const KEY = 'dsh-product-design:doc:v2';
const doc = () => JSON.parse(window.localStorage.getItem(KEY));
const q = (sel) => container.querySelectorAll(sel);
const one = (sel) => container.querySelector(sel);
const btn = (title) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('title') === title);

async function click(target) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}
async function key(k, extra = {}) {
  await act(async () => {
    document.body.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }),
    );
  });
}
async function mouse(target, type, init = {}) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, ...init }));
  });
}

function makeDoc(elements) {
  return {
    name: '',
    activePageId: 'p1',
    pages: [
      {
        id: 'p1',
        name: 'P',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        elements,
      },
    ],
  };
}
const el = (over) => ({
  id: 'e1',
  type: 'text',
  x: 0,
  y: 0,
  w: 100,
  h: 30,
  state: 'default',
  props: {},
  ...over,
});

async function mountWith(docValue) {
  window.localStorage.setItem(KEY, JSON.stringify(docValue));
  plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  container.remove();
});

describe('容器与编组', () => {
  it('递归渲染容器子元素，图层树按层级缩进', async () => {
    await mountWith(
      makeDoc([
        el({
          id: 'c1',
          type: 'container',
          x: 20,
          y: 20,
          w: 300,
          h: 200,
          props: { name: '卡片容器', background: '#fff', clipContent: true },
          children: [
            el({ id: 'b1', type: 'button', x: 10, y: 10, w: 100, h: 40, props: { text: '按钮' } }),
          ],
        }),
        el({ id: 't1', x: 40, y: 400, w: 120, props: { text: '标题' } }),
      ]),
    );
    expect(q('.dpd-container').length).toBe(1);
    expect(one('[data-el-id="b1"]')).toBeTruthy();
    expect(one('.dpd-container [data-el-id="b1"]')).toBeTruthy();

    await click(btn('图层'));
    const layers = Array.from(q('.dpd-layer'));
    const containerLayer = layers.find((row) => row.textContent.includes('卡片容器'));
    const childLayer = layers.find((row) => row.textContent.includes('按钮'));
    expect(containerLayer.style.paddingLeft).toBe('8px');
    expect(childLayer.style.paddingLeft).toBe('24px');

    await click(childLayer);
    expect(one('[data-el-id="b1"]').className).toContain('dpd-sel');
    expect(q('.dpd-handle').length).toBe(8);
  });

  it('组件库可以添加容器', async () => {
    await mountWith(makeDoc([]));
    await click(btn('组件库'));
    await click(btn('容器'));
    const created = doc().pages[0].elements.find((e) => e.type === 'container');
    expect(created).toBeTruthy();
    expect(created.children).toEqual([]);
  });

  it('Shift 多选后 ⌘G 编组、⇧⌘G 取消编组', async () => {
    await mountWith(makeDoc([el({ id: 'a' }), el({ id: 'b', x: 100 }), el({ id: 'c', x: 200 })]));
    await mouse(one('[data-el-id="a"]'), 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mouseup', { button: 0 });
    await mouse(one('[data-el-id="b"]'), 'mousedown', {
      clientX: 0,
      clientY: 0,
      button: 0,
      shiftKey: true,
    });
    await mouse(window, 'mouseup', { button: 0 });
    expect(q('.dpd-el.dpd-sel').length).toBe(2);

    await key('g', { metaKey: true });
    const grouped = doc().pages[0].elements;
    expect(grouped.length).toBe(2);
    const group = grouped.find((e) => e.type === 'group');
    expect(group).toBeTruthy();
    expect(group.children.map((e) => e.id).sort()).toEqual(['a', 'b']);

    await key('g', { metaKey: true, shiftKey: true });
    const ungrouped = doc().pages[0].elements;
    expect(ungrouped.length).toBe(3);
    expect(ungrouped.some((e) => e.type === 'group')).toBe(false);
  });

  it('拖动普通元素进入容器后在容器内成为子元素', async () => {
    await mountWith(
      makeDoc([
        el({
          id: 'c1',
          type: 'container',
          x: 20,
          y: 20,
          w: 300,
          h: 200,
          props: { name: '卡片', background: '#fff', clipContent: true },
          children: [
            el({ id: 'b1', type: 'button', x: 10, y: 10, w: 100, h: 40, props: { text: '按钮' } }),
          ],
        }),
        el({ id: 't1', x: 40, y: 400, w: 100, h: 30, props: { text: '拖我' } }),
      ]),
    );
    await click(btn('磁吸')); // 关掉吸附，保证拖拽位移可预期
    const target = one('[data-el-id="t1"]');
    await mouse(target, 'mousedown', { clientX: 0, clientY: 400, button: 0 });
    await mouse(window, 'mousemove', { clientX: 60, clientY: 85, button: 0 });
    await mouse(window, 'mouseup', { clientX: 60, clientY: 85, button: 0 });

    const page = doc().pages[0];
    expect(page.elements.length).toBe(1);
    const box = page.elements[0];
    expect(box.type).toBe('container');
    expect(box.children.map((e) => e.id)).toEqual(['b1', 't1']);
    const moved = box.children.find((e) => e.id === 't1');
    expect(moved.x).toBe(80);
    expect(moved.y).toBe(65);
  });

  it('把子元素拖出容器会回到页面根层并保持绝对位置', async () => {
    await mountWith(
      makeDoc([
        el({
          id: 'c1',
          type: 'container',
          x: 20,
          y: 20,
          w: 300,
          h: 200,
          props: { name: '卡片', background: '#fff', clipContent: true },
          children: [
            el({ id: 'b1', type: 'button', x: 10, y: 10, w: 100, h: 40, props: { text: '按钮' } }),
          ],
        }),
      ]),
    );
    await click(btn('磁吸'));
    const child = one('[data-el-id="b1"]');
    await mouse(child, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mousemove', { clientX: 20, clientY: 450, button: 0 });
    await mouse(window, 'mouseup', { clientX: 20, clientY: 450, button: 0 });

    const page = doc().pages[0];
    expect(page.elements.map((e) => e.id).sort()).toEqual(['b1', 'c1']);
    const moved = page.elements.find((e) => e.id === 'b1');
    expect(moved.x).toBe(50); // 原绝对 30 + 20
    expect(moved.y).toBe(480); // 原绝对 30 + 450
    expect(page.elements.find((e) => e.id === 'c1').children).toHaveLength(0);
  });

  it('拖动靠近画板边缘时显示磁吸参考线', async () => {
    await mountWith(makeDoc([el({ id: 'a', x: 100, y: 100, w: 200, h: 50 })]));
    const target = one('[data-el-id="a"]');
    await mouse(target, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mousemove', { clientX: 85, clientY: 0, button: 0 });
    expect(q('.dpd-guide.v').length).toBeGreaterThanOrEqual(1);
    expect(Array.from(q('.dpd-guide.v')).some((g) => g.style.left === '390px')).toBe(true);
    await mouse(window, 'mouseup', { clientX: 85, clientY: 0, button: 0 });
    expect(q('.dpd-guide').length).toBe(0);
  });

  it('多选后执行左对齐', async () => {
    await mountWith(makeDoc([el({ id: 'a', x: 100 }), el({ id: 'b', x: 200, y: 100 })]));
    await mouse(one('[data-el-id="a"]'), 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mouseup', { button: 0 });
    await mouse(one('[data-el-id="b"]'), 'mousedown', {
      clientX: 0,
      clientY: 0,
      button: 0,
      shiftKey: true,
    });
    await mouse(window, 'mouseup', { button: 0 });
    await click(btn('左对齐'));
    const elements = doc().pages[0].elements;
    expect(elements.every((e) => e.x === 100)).toBe(true);
  });
});
