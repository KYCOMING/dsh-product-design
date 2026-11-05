import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyOps, emptyDoc } from '../src/host/model.js';
import { reflowPage, resizeElement } from '../src/shared/layout.js';
import { loadPlugin } from './helpers/load-plugin.js';

const KEY = 'dsh-product-design:doc:v3';
const stored = () => JSON.parse(window.localStorage.getItem(KEY));

// ------------------------------------------------------------------
// engine
// ------------------------------------------------------------------
const el = (over) => ({
  id: 'e1',
  type: 'text',
  x: 100,
  y: 50,
  w: 100,
  h: 40,
  state: 'default',
  props: {},
  interactions: [],
  constraints: { h: 'left', v: 'top' },
  ...over,
});

describe('约束求解', () => {
  it('水平：左/右/左右拉伸/居中/按比例', () => {
    const base = el({});
    expect(resizeElement(base, 400, 400, 800, 400)).toMatchObject({ x: 100, w: 100 });
    expect(
      resizeElement(el({ constraints: { h: 'right', v: 'top' } }), 400, 400, 800, 400),
    ).toMatchObject({ x: 500, w: 100 });
    expect(
      resizeElement(el({ constraints: { h: 'leftRight', v: 'top' } }), 400, 400, 800, 400),
    ).toMatchObject({ x: 100, w: 500 });
    expect(
      resizeElement(el({ constraints: { h: 'center', v: 'top' } }), 400, 400, 800, 400),
    ).toMatchObject({ x: 300, w: 100 });
    expect(
      resizeElement(el({ constraints: { h: 'scale', v: 'top' } }), 400, 400, 800, 400),
    ).toMatchObject({ x: 200, w: 200 });
  });

  it('垂直：上/下/上下拉伸/居中/按比例', () => {
    expect(
      resizeElement(el({ constraints: { h: 'left', v: 'bottom' } }), 400, 400, 400, 800),
    ).toMatchObject({ y: 450, h: 40 });
    expect(
      resizeElement(el({ constraints: { h: 'left', v: 'topBottom' } }), 400, 400, 400, 800),
    ).toMatchObject({ y: 50, h: 440 });
    expect(
      resizeElement(el({ constraints: { h: 'left', v: 'center' } }), 400, 400, 400, 800),
    ).toMatchObject({ y: 250, h: 40 });
    expect(
      resizeElement(el({ constraints: { h: 'left', v: 'scale' } }), 400, 400, 400, 800),
    ).toMatchObject({ y: 100, h: 80 });
  });

  it('容器尺寸变化会递归套用子元素约束', () => {
    const box = el({
      type: 'container',
      x: 0,
      y: 0,
      w: 200,
      h: 100,
      constraints: { h: 'leftRight', v: 'top' },
      children: [
        el({
          id: 'k',
          type: 'text',
          x: 10,
          y: 10,
          w: 50,
          h: 20,
          constraints: { h: 'leftRight', v: 'top' },
        }),
      ],
    });
    const out = resizeElement(box, 300, 300, 400, 300);
    expect(out.w).toBe(300); // 0 left + 100 right margin
    expect(out.children[0]).toMatchObject({ x: 10, w: 150 });
  });
});

describe('Auto Layout', () => {
  const page = (layout, kids) => ({
    id: 'p',
    name: 'P',
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    states: {},
    elements: [
      {
        id: 'box',
        type: 'container',
        x: 0,
        y: 0,
        w: 300,
        h: 200,
        state: 'default',
        props: {},
        constraints: { h: 'left', v: 'top' },
        layout,
        children: kids,
      },
    ],
  });

  it('纵向：gap + padding + 交叉轴拉伸', () => {
    const out = reflowPage(
      page(
        {
          mode: 'stack',
          direction: 'column',
          gap: 10,
          padding: 16,
          align: 'stretch',
          justify: 'start',
        },
        [el({ id: 'a', h: 20 }), el({ id: 'b', h: 30 })],
      ),
    );
    const [a, b] = out.elements[0].children;
    expect(a).toMatchObject({ x: 16, y: 16, w: 300 - 32 });
    expect(b).toMatchObject({ x: 16, y: 16 + 20 + 10, w: 300 - 32 });
  });

  it('横向：居中与两端对齐', () => {
    const centered = reflowPage(
      page(
        {
          mode: 'stack',
          direction: 'row',
          gap: 10,
          padding: 0,
          align: 'center',
          justify: 'center',
        },
        [el({ id: 'a', w: 50, h: 20 }), el({ id: 'b', w: 50, h: 20 })],
      ),
    );
    const [ca, cb] = centered.elements[0].children;
    expect(ca).toMatchObject({ x: 95, y: 90 });
    expect(cb).toMatchObject({ x: 155, y: 90 });

    const between = reflowPage(
      page(
        { mode: 'stack', direction: 'row', gap: 0, padding: 0, align: 'start', justify: 'between' },
        [el({ id: 'a', w: 50, h: 20 }), el({ id: 'b', w: 50, h: 20 })],
      ),
    );
    expect(between.elements[0].children[0].x).toBe(0);
    expect(between.elements[0].children[1].x).toBe(250);
  });

  it('新增子元素后自动重排（host applyOps 集成）', () => {
    const first = applyOps(emptyDoc(), [
      { kind: 'add_page' },
      {
        kind: 'add_container',
        x: 0,
        y: 0,
        w: 300,
        h: 200,
        layout: { mode: 'stack', direction: 'column', gap: 8, padding: 12 },
      },
    ]);
    const containerId = first.results[1].elementId;
    const second = applyOps(first.doc, [
      { kind: 'add_element', containerId, type: 'text', w: 50, h: 20 },
      { kind: 'add_element', containerId, type: 'text', w: 50, h: 20 },
    ]);
    const [a, b] = second.doc.pages[0].elements[0].children;
    expect(a).toMatchObject({ x: 12, y: 12 });
    expect(b).toMatchObject({ x: 12, y: 12 + 20 + 8 });
  });
});

// ------------------------------------------------------------------
// UI
// ------------------------------------------------------------------
let container;
let root;

const one = (sel) => container.querySelector(sel);
const all = (sel) => Array.from(container.querySelectorAll(sel));

async function mouse(target, type, init = {}) {
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, ...init }));
  });
}
async function setSelect(target, value) {
  await act(async () => {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
    if (desc?.set) desc.set.call(target, value);
    else target.value = value;
    target.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

function seededDoc() {
  const child = (id, y) => ({
    id,
    type: 'text',
    x: 0,
    y,
    w: 50,
    h: 20,
    state: 'default',
    props: { text: id },
    interactions: [],
    constraints: { h: 'left', v: 'top' },
  });
  return {
    name: '',
    activePageId: 'p1',
    pages: [
      {
        id: 'p1',
        name: 'P',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        states: {},
        elements: [
          {
            id: 'box',
            type: 'container',
            x: 0,
            y: 0,
            w: 300,
            h: 200,
            state: 'default',
            props: { name: 'Box' },
            constraints: { h: 'left', v: 'top' },
            layout: {
              mode: 'stack',
              direction: 'column',
              gap: 8,
              padding: 10,
              align: 'start',
              justify: 'start',
            },
            children: [child('a', 0), child('b', 100)],
          },
        ],
      },
    ],
  };
}

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  window.localStorage.setItem(KEY, JSON.stringify(seededDoc()));
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

describe('Auto Layout 编辑器', () => {
  it('加载时按布局重排，属性面板可切方向', async () => {
    const box = stored().pages[0].elements[0];
    expect(box.children[0]).toMatchObject({ x: 10, y: 10 });
    expect(box.children[1]).toMatchObject({ x: 10, y: 38 });

    // 选中容器（直接点在容器节点上，而不是子元素）
    const containerNode = one('.dpd-el');
    await mouse(containerNode, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mouseup', { button: 0 });

    const direction = all('.dpd-right select').find((s) => s.title === '方向');
    expect(direction).toBeTruthy();
    await setSelect(direction, 'row');
    const after = stored().pages[0].elements[0];
    expect(after.layout.direction).toBe('row');
    expect(after.children[0]).toMatchObject({ x: 10, y: 10 });
    expect(after.children[1]).toMatchObject({ x: 68, y: 10 });
  });

  it('拖动子元素会改变布局顺序，而不是自由移动', async () => {
    const nodes = container.querySelectorAll('.dpd-el');
    const second = nodes[2];
    await mouse(second, 'mousedown', { clientX: 0, clientY: 0, button: 0 });
    await mouse(window, 'mousemove', { clientX: 0, clientY: -60, button: 0 });
    await mouse(window, 'mouseup', { clientX: 0, clientY: -60, button: 0 });
    const box = stored().pages[0].elements[0];
    expect(box.children.map((k) => k.id)).toEqual(['b', 'a']);
    expect(box.children[0]).toMatchObject({ y: 10 });
  });
});
