import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;
let plugin;

const KEY = 'dsh-product-design:doc:v3';
const doc = () => JSON.parse(window.localStorage.getItem(KEY));
const q = (sel) => container.querySelectorAll(sel);
const one = (sel) => container.querySelector(sel);
const btn = (title) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('title') === title);
const btnText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

async function click(target) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}
async function dblclick(target) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  });
}
async function contextmenu(target, init = {}) {
  await act(async () => {
    target.dispatchEvent(
      new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, ...init }),
    );
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
async function selectElement(el) {
  await mouse(el, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
  await mouse(window, 'mouseup', { button: 0 });
}
async function setValue(el, value) {
  await act(async () => {
    const proto = window.HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function page(id, name, elements) {
  return {
    id,
    name,
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    states: {},
    elements: elements || [],
  };
}
const el = (over) => ({
  id: 'e1',
  type: 'text',
  name: '',
  x: 0,
  y: 0,
  w: 100,
  h: 30,
  hidden: false,
  locked: false,
  opacity: 1,
  state: 'default',
  props: {},
  interactions: [],
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

describe('就地编辑与图层', () => {
  it('双击文本进入就地编辑，Enter 提交', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Hello' } })])],
    });
    const node = one('.dpd-el');
    await dblclick(node);
    const editor = one('textarea.dpd-textEditor');
    expect(editor).toBeTruthy();
    await setValue(editor, 'Changed');
    await act(async () => {
      editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(doc().pages[0].elements[0].props.text).toBe('Changed');
    expect(one('textarea.dpd-textEditor')).toBeNull();
  });

  it('图层可隐藏，隐藏后画布不再渲染', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Hi' } })])],
    });
    await click(btn('图层'));
    expect(q('.dpd-layer').length).toBe(1);
    await click(btn('隐藏图层'));
    expect(doc().pages[0].elements[0].hidden).toBe(true);
    expect(q('.dpd-el').length).toBe(0);
    await click(btn('显示图层'));
    expect(doc().pages[0].elements[0].hidden).toBe(false);
    expect(q('.dpd-el').length).toBe(1);
  });

  it('⌘C / ⌘V 复制选中元素到当前页', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Copy me' } })])],
    });
    await selectElement(one('.dpd-el'));
    await key('c', { metaKey: true });
    await key('v', { metaKey: true });
    const els = doc().pages[0].elements;
    expect(els).toHaveLength(2);
    expect(els[1].id).not.toBe(els[0].id);
    expect(els[1].x).toBe(els[0].x + 16);
  });

  it('右键菜单可删除元素', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Bye' } })])],
    });
    await contextmenu(one('.dpd-el'), { clientX: 40, clientY: 40 });
    const menu = one('.dpd-ctxmenu');
    expect(menu).toBeTruthy();
    const del = Array.from(menu.querySelectorAll('button')).find((b) =>
      b.textContent.includes('删除'),
    );
    expect(del).toBeTruthy();
    await click(del);
    expect(one('.dpd-ctxmenu')).toBeNull();
    expect(doc().pages[0].elements).toHaveLength(0);
  });
});

describe('属性面板', () => {
  it('空状态下可编辑页面状态文案', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Hi' } })])],
    });
    await click(btnText('空状态'));
    const inputs = Array.from(container.querySelectorAll('.dpd-right input[type="text"]'));
    expect(container.textContent).toContain('页面状态文案');
    const title = inputs[inputs.length - 3];
    await act(async () => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc?.set) desc.set.call(title, '还没有项目');
      else title.value = '还没有项目';
      title.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    expect(doc().pages[0].states.empty.title).toBe('还没有项目');
    expect(container.textContent).toContain('还没有项目');
  });

  it('多选后可批量改颜色', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [
        page('p1', 'P', [
          el({ id: 'a', x: 0, y: 0, props: { text: 'A' } }),
          el({ id: 'b', x: 0, y: 100, props: { text: 'B' } }),
        ]),
      ],
    });
    const nodes = container.querySelectorAll('.dpd-el');
    await mouse(nodes[0], 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mouseup', { button: 0 });
    await mouse(nodes[1], 'mousedown', { clientX: 0, clientY: 0, button: 0, shiftKey: true });
    await mouse(window, 'mouseup', { button: 0 });
    expect(container.textContent).toContain('已选多个图层');

    const color = container.querySelector('.dpd-right input[type="color"]');
    expect(color).toBeTruthy();
    await act(async () => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc?.set) desc.set.call(color, '#ff0000');
      else color.value = '#ff0000';
      color.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    expect(doc().pages[0].elements[0].props.color).toBe('#ff0000');
    expect(doc().pages[0].elements[1].props.color).toBe('#ff0000');
  });
});

describe('导出菜单', () => {
  it('工具栏列出 PNG / HTML / React 三种导出', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [page('p1', 'P', [el({ props: { text: 'Hi' } })])],
    });
    await click(btnText('导出'));
    const menu = one('.dpd-exportPop');
    expect(menu).toBeTruthy();
    const text = menu.textContent;
    expect(text).toContain('PNG');
    expect(text).toContain('HTML 原型');
    expect(text).toContain('React + Tailwind');
  });
});

describe('原型交互', () => {
  it('预览里点击带 navigate 的元素会跳到目标页，并可返回', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [
        page('p1', 'Home', [
          el({
            id: 'btn1',
            type: 'button',
            props: { text: '去详情' },
            interactions: [{ trigger: 'click', action: 'navigate', targetPageId: 'p2' }],
          }),
        ]),
        page('p2', 'Detail', [el({ id: 'txt2', type: 'text', props: { text: '详情页内容' } })]),
      ],
    });
    await click(btnText('预览'));
    expect(one('.dpd-canvas').textContent).toContain('去详情');
    await click(one('.dpd-el'));
    expect(one('.dpd-canvas').textContent).toContain('详情页内容');
    const back = btnText('‹ 返回');
    expect(back).toBeTruthy();
    await click(back);
    expect(one('.dpd-canvas').textContent).toContain('去详情');
  });

  it('openOverlay 交互把目标页渲染为弹层', async () => {
    await mountWith({
      name: '',
      activePageId: 'p1',
      pages: [
        page('p1', 'Home', [
          el({
            id: 'btn1',
            type: 'button',
            props: { text: '打开弹窗' },
            interactions: [{ trigger: 'click', action: 'openOverlay', targetPageId: 'p2' }],
          }),
        ]),
        page('p2', 'Dialog', [el({ id: 'txt2', type: 'text', props: { text: '弹层内容' } })]),
      ],
    });
    await click(btnText('预览'));
    await click(one('.dpd-el'));
    expect(one('.dpd-overlayBackdrop')).toBeTruthy();
    expect(one('.dpd-canvas').textContent).toContain('弹层内容');
  });
});
