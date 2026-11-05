import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;
let plugin;

const doc = () => JSON.parse(window.localStorage.getItem('dsh-product-design:doc:v3'));

const q = (sel) => container.querySelectorAll(sel);
const btn = (title) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('title') === title);
const btnText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

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

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('编辑行为', () => {
  it('初始为单页，撤销按钮置灰', () => {
    expect(q('.dpd-pageRow').length).toBe(1);
    const undo = btn('撤销 (⌘Z)');
    expect(undo).toBeTruthy();
    expect(undo.disabled).toBe(true);
  });

  it('新增页支持工具栏与快捷键撤销 / 重做', async () => {
    await click(btn('新增页'));
    expect(q('.dpd-pageRow').length).toBe(2);

    const undo = btn('撤销 (⌘Z)');
    expect(undo.disabled).toBe(false);
    await click(undo);
    expect(q('.dpd-pageRow').length).toBe(1);

    await click(btn('重做 (⇧⌘Z)'));
    expect(q('.dpd-pageRow').length).toBe(2);

    await key('z', { metaKey: true });
    expect(q('.dpd-pageRow').length).toBe(1);

    await key('z', { metaKey: true, shiftKey: true });
    expect(q('.dpd-pageRow').length).toBe(2);

    await key('z', { metaKey: true });
    expect(q('.dpd-pageRow').length).toBe(1);
  });

  it('方向键微移、Delete 删除、撤销恢复、Esc 取消选中', async () => {
    const el = container.querySelector('.dpd-el');
    expect(el).toBeTruthy();
    const before = doc().pages[0].elements[0];

    await mouse(el, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mouseup', { button: 0 });
    expect(q('.dpd-el.dpd-sel').length).toBe(1);

    await key('ArrowRight');
    expect(doc().pages[0].elements[0].x).toBe(before.x + 1);

    const y0 = doc().pages[0].elements[0].y;
    await key('ArrowDown', { shiftKey: true });
    expect(doc().pages[0].elements[0].y).toBe(y0 + 10);

    const count = q('.dpd-el').length;
    await key('Delete');
    expect(q('.dpd-el').length).toBe(count - 1);

    await key('z', { metaKey: true });
    expect(q('.dpd-el').length).toBe(count);

    await key('Escape');
    expect(q('.dpd-el.dpd-sel').length).toBe(0);
  });

  it('拖拽整体只算一步撤销，重做可恢复', async () => {
    const el = container.querySelector('.dpd-el');
    const start = doc().pages[0].elements[0];

    await mouse(el, 'mousedown', { clientX: 100, clientY: 100, button: 0 });
    for (let i = 1; i <= 6; i++) {
      await mouse(window, 'mousemove', { clientX: 100 + i * 5, clientY: 100 + i * 2, button: 0 });
    }
    await mouse(window, 'mouseup', { clientX: 130, clientY: 112, button: 0 });

    expect(doc().pages[0].elements[0].x).toBe(start.x + 30);
    expect(doc().pages[0].elements[0].y).toBe(start.y + 12);

    await click(btn('撤销 (⌘Z)'));
    expect(doc().pages[0].elements[0].x).toBe(start.x);

    await click(btn('重做 (⇧⌘Z)'));
    expect(doc().pages[0].elements[0].x).toBe(start.x + 30);
  });

  it('空格 + 拖拽平移画布', async () => {
    const canvas = container.querySelector('.dpd-canvas');
    canvas.scrollLeft = 100;
    canvas.scrollTop = 100;

    await act(async () => {
      document.body.dispatchEvent(
        new window.KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }),
      );
    });
    await mouse(canvas, 'mousedown', { clientX: 200, clientY: 200, button: 0 });
    await mouse(window, 'mousemove', { clientX: 150, clientY: 180, button: 0 });
    await mouse(window, 'mouseup', { clientX: 150, clientY: 180, button: 0 });
    await act(async () => {
      document.body.dispatchEvent(
        new window.KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }),
      );
    });

    expect(canvas.scrollLeft).toBe(150);
    expect(canvas.scrollTop).toBe(120);
  });

  it('预览模式下开关可切换状态', async () => {
    await click(btnText('预览'));
    const els = container.querySelectorAll('.dpd-el');
    const toggle = els[6];
    const before = doc().pages[0].elements[6].state;
    await click(toggle);
    expect(doc().pages[0].elements[6].state).not.toBe(before);
  });

  it('切换画布尺寸按宽高分别缩放，切回可还原', async () => {
    const select = container.querySelector('select.dpd-select');
    const setSelect = async (el, value) => {
      await act(async () => {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
        if (desc?.set) desc.set.call(el, value);
        else el.value = value;
        el.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
    };

    const beforeW = doc().pages[0].elements[0].w;
    const beforeH = doc().pages[0].elements[0].h;
    await setSelect(select, 'desktop');
    expect(doc().pages[0].frame.w).toBe(1280);
    expect(doc().pages[0].elements[0].w).toBeGreaterThan(beforeW * 2);

    await setSelect(select, 'mobile');
    expect(doc().pages[0].frame.w).toBe(390);
    expect(Math.abs(doc().pages[0].elements[0].w - beforeW)).toBeLessThanOrEqual(2);
    expect(Math.abs(doc().pages[0].elements[0].h - beforeH)).toBeLessThanOrEqual(2);
  });

  it('关闭「缩放内容」后切画板尺寸不改变元素', async () => {
    const select = container.querySelector('select.dpd-select');
    const checkbox = Array.from(container.querySelectorAll('.dpd-checkRow input')).find(
      (input) => input.type === 'checkbox',
    );
    expect(checkbox).toBeTruthy();
    await act(async () => {
      checkbox.click();
    });
    const before = doc().pages[0].elements[0];
    await act(async () => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
      if (desc?.set) desc.set.call(select, 'desktop');
      else select.value = 'desktop';
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(doc().pages[0].frame.w).toBe(1280);
    expect(doc().pages[0].elements[0].w).toBe(before.w);
  });
});
