import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;

const q = (sel) => container.querySelectorAll(sel);
const one = (sel) => container.querySelector(sel);
const btnText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

async function click(target) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}
async function mouse(target, type, init = {}) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, ...init }));
  });
}

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  // 产品默认 0 页；预览等用例需要一个画板，种一个单页文档。
  window.localStorage.setItem(
    'dsh-product-design:doc:v3',
    JSON.stringify({
      name: '',
      activePageId: 'p1',
      pages: [
        {
          id: 'p1',
          name: '页面 1',
          frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
          states: {},
          elements: [],
        },
      ],
    }),
  );
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  const plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  container.remove();
});

describe('侧栏宽度与预览布局', () => {
  it('右侧属性栏可拖拽调宽并持久化', async () => {
    const right = one('.dpd-right');
    expect(right.style.width).toBe('242px');
    const resizer = one('.dpd-resizer.left');
    expect(resizer).toBeTruthy();

    await mouse(resizer, 'mousedown', { clientX: 800, clientY: 100, button: 0 });
    await mouse(window, 'mousemove', { clientX: 700, clientY: 100, button: 0 });
    await mouse(window, 'mouseup', { clientX: 700, clientY: 100, button: 0 });

    expect(one('.dpd-right').style.width).toBe('342px');
    expect(JSON.parse(window.localStorage.getItem('dsh-product-design:ui:v1')).rightWidth).toBe(
      342,
    );
  });

  it('右侧属性栏可以收起为窄条，再展开', async () => {
    expect(one('.dpd-right.collapsed')).toBeNull();
    const collapse = one('.dpd-right .dpd-mini');
    expect(collapse.title).toBe('收起属性栏');
    await click(collapse);
    expect(one('.dpd-right.collapsed')).toBeTruthy();
    expect(one('.dpd-right.collapsed .dpd-rightToggle')).toBeTruthy();
    expect(one('.dpd-right.collapsed .dpd-empty')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('dsh-product-design:ui:v1')).rightCollapsed).toBe(
      true,
    );

    await click(one('.dpd-right.collapsed .dpd-rightToggle'));
    expect(one('.dpd-right.collapsed')).toBeNull();
    expect(one('.dpd-right .dpd-empty')).toBeTruthy();
  });

  it('预览时只保留产品画板，退出后恢复编辑器', async () => {
    await click(btnText('预览'));
    expect(q('.dpd-toolbar').length).toBe(0);
    expect(q('.dpd-leftcol').length).toBe(0);
    expect(q('.dpd-right').length).toBe(0);
    expect(q('.dpd-pageLabel').length).toBe(0);
    expect(q('.dpd-frame').length).toBe(1);
    expect(one('.dpd-canvasinner').style.backgroundImage).toBe('none');
    expect(one('.dpd-previewExit')).toBeTruthy();

    await click(one('.dpd-previewExit'));
    expect(q('.dpd-toolbar').length).toBe(1);
    expect(q('.dpd-leftcol').length).toBe(1);
    expect(q('.dpd-right').length).toBe(1);
    expect(q('.dpd-previewExit').length).toBe(0);
  });
});
