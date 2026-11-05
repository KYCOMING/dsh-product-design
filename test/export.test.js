// @vitest-environment node
import { transformSync } from 'esbuild';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  buildHtml,
  buildReact,
  buildSvg,
  renderElement,
  renderPage,
} from '../src/client/export/index.js';

const t = (key) => key;

const page = (id, name, elements, frame = { w: 390, h: 844, background: '#ffffff' }) => ({
  id,
  name,
  frame,
  states: {},
  elements,
});

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
  constraints: { h: 'left', v: 'top' },
  ...over,
});

const doc = () => ({
  name: 'Demo',
  activePageId: 'p1',
  pages: [
    page('p1', '首页', [
      el({
        id: 'title',
        type: 'text',
        x: 24,
        y: 40,
        w: 320,
        h: 40,
        props: { text: '欢迎 <script>alert(1)</script>', fontSize: 22 },
      }),
      el({
        id: 'go',
        type: 'button',
        x: 24,
        y: 120,
        w: 160,
        h: 44,
        props: { text: '去详情' },
        interactions: [{ trigger: 'click', action: 'navigate', targetPageId: 'p2' }],
      }),
      el({ id: 'hidden', type: 'text', hidden: true, props: { text: '不该出现' } }),
      el({
        id: 'box',
        type: 'container',
        x: 24,
        y: 200,
        w: 300,
        h: 120,
        props: { background: '#f8fafc', radius: 12 },
        layout: {
          mode: 'stack',
          direction: 'column',
          gap: 8,
          padding: { t: 10, r: 10, b: 10, l: 10 },
          align: 'start',
          justify: 'start',
        },
        children: [el({ id: 'kid', type: 'text', w: 120, h: 20, props: { text: '子项' } })],
      }),
    ]),
    page('p2', '详情', [el({ id: 'detail', type: 'text', props: { text: '详情内容' } })]),
  ],
});

describe('HTML 导出', () => {
  const html = buildHtml(doc(), { t });

  it('是完整的单文件文档，包含全部页面与导航运行时', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).toContain('data-page="p1"');
    expect(html).toContain('data-page="p2"');
    expect(html).toContain('data-nav="p2"');
    expect(html).toContain('data-go="p2"');
    expect(html).toContain('function show(');
  });

  it('转义用户文本，隐藏元素不导出', () => {
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('不该出现');
  });

  it('运行时可以完成页面跳转', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const d = dom.window.document;
    expect(d.querySelectorAll('.dpd-page').length).toBe(2);
    expect(d.querySelector('.dpd-page.active').getAttribute('data-page')).toBe('p1');
    d.querySelector('[data-nav="p2"]').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true }),
    );
    expect(d.querySelector('.dpd-page.active').getAttribute('data-page')).toBe('p2');
    dom.window.close();
  });

  it('不包含编辑器辅助线/图层标签', () => {
    expect(html).not.toContain('dpd-container');
    expect(html).not.toContain('dashed');
    expect(html).not.toContain('容器');
    expect(html).toContain('background:#f8fafc');
  });
});

describe('React + Tailwind 导出', () => {
  const source = buildReact(doc(), { t });

  it('生成 App、页面组件与状态路由', () => {
    expect(source).toContain("import { useState } from 'react';");
    expect(source).toContain('export default function App()');
    expect(source).toContain('function 首页(');
    expect(source).toContain('const PAGES = {');
    expect(source).toContain("onClick={() => onNavigate('p2')}");
  });

  it('使用 Tailwind 尺寸、颜色与 flex 自动布局', () => {
    expect(source).toContain('w-[390px]');
    expect(source).toContain('h-[844px]');
    expect(source).toContain('left-[24px]');
    expect(source).toContain('flex');
    expect(source).toContain('flex-col');
    expect(source).toContain('gap-[8px]');
    expect(source).toContain('p-[10px]');
  });

  it('生成的 JSX 可以被 esbuild 解析', () => {
    expect(() => transformSync(source, { loader: 'jsx', format: 'esm' })).not.toThrow();
  });

  it('转义文本并保留语义标签', () => {
    expect(source).toContain('<button type="button"');
    expect(source).toContain('"欢迎 <script>alert(1)</script>"');
    expect(source).not.toContain('不该出现');
  });
});

describe('PNG 渲染输入', () => {
  it('生成带 foreignObject 的 SVG，尺寸按倍率放大', () => {
    const svg = buildSvg(doc().pages[0], { t }, 2);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="780"');
    expect(svg).toContain('height="1688"');
    expect(svg).toContain('<foreignObject');
    expect(svg).toContain('欢迎');
  });

  it('SVG 必须是合法 XML（引号/& 不能破坏 style 属性）', () => {
    const tricky = doc();
    tricky.pages[0].elements[0].props.text = '引号 " 与 & 与 <b>';
    const svg = buildSvg(tricky.pages[0], { t }, 2);
    const dom = new JSDOM();
    const parsed = new dom.window.DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(svg).toContain('&amp;');
  });

  it('页面渲染带固定尺寸与背景', () => {
    const html = renderPage(doc().pages[0], { t });
    expect(html).toContain('width:390px');
    expect(html).toContain('height:844px');
    expect(html).toContain('background:#ffffff');
  });

  it('隐藏元素不渲染', () => {
    expect(renderElement(el({ hidden: true }), { t })).toBe('');
  });
});

describe('图片导出', () => {
  const imageDoc = () => ({
    name: 'Image demo',
    activePageId: 'p1',
    pages: [
      page('p1', '图片页', [
        el({
          id: 'pic',
          type: 'image',
          w: 200,
          h: 120,
          props: {
            src: 'https://example.com/a.png?x=1&y=2',
            fit: 'contain',
            alt: '封面',
          },
        }),
      ]),
    ],
  });

  it('HTML 导出渲染真实图片并转义 URL', () => {
    const html = buildHtml(imageDoc(), { t });
    expect(html).toContain('<img src="https://example.com/a.png?x=1&amp;y=2"');
    expect(html).toContain('object-fit:contain');
    expect(html).not.toContain('repeating-linear-gradient');
  });

  it('React 导出渲染 img 且 JSX 可解析', () => {
    const source = buildReact(imageDoc(), { t });
    expect(source).toContain('<img src={"https://example.com/a.png?x=1&y=2"}');
    expect(source).toContain('object-contain');
    expect(() => transformSync(source, { loader: 'jsx', format: 'esm' })).not.toThrow();
  });

  it('没有 src 时保留占位图', () => {
    const html = buildHtml(
      { ...imageDoc(), pages: [page('p1', '占位', [el({ type: 'image', props: {} })])] },
      { t },
    );
    expect(html).toContain('repeating-linear-gradient');
    expect(html).not.toContain('<img');
  });
});

describe('页面状态变体导出', () => {
  const stateDoc = () => ({
    name: 'States',
    activePageId: 'p1',
    pages: [
      page('p1', '首页', [el({ id: 'baseText', type: 'text', props: { text: '正常内容' } })]),
      {
        ...page('v1', '首页 · 空状态', [
          el({ id: 'emptyText', type: 'text', props: { text: '还没有内容' } }),
        ]),
        variantOf: 'p1',
        stateKey: 'empty',
        states: {},
      },
    ],
  });

  it('HTML 导出包含变体页、状态切换条，导航只列基础页', () => {
    const html = buildHtml(stateDoc(), { t });
    expect(html).toContain('data-variant-of="p1"');
    expect(html).toContain('data-state-key="empty"');
    expect(html).toContain('id="statebar"');
    expect(html).toContain('data-go="p1"');
    expect(html).not.toContain('data-go="v1"');
    expect(html).toContain('还没有内容');
  });

  it('HTML 运行时可以在基础页与状态变体之间切换', () => {
    const dom = new JSDOM(buildHtml(stateDoc(), { t }), { runScripts: 'dangerously' });
    const d = dom.window.document;
    const active = () => d.querySelector('.dpd-page.active').getAttribute('data-page');
    expect(active()).toBe('p1');
    const empty = d.querySelector('#statebar button[data-state="empty"]');
    expect(empty.disabled).toBe(false);
    expect(d.querySelector('#statebar button[data-state="loading"]').disabled).toBe(true);
    empty.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(active()).toBe('v1');
    d.querySelector('#statebar button[data-state="normal"]').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true }),
    );
    expect(active()).toBe('p1');
    dom.window.close();
  });

  it('React 导出带上状态映射与切换按钮', () => {
    const source = buildReact(stateDoc(), { t });
    expect(source).toContain('const BASE_OF = {"v1":"p1"};');
    expect(source).toContain('const STATE_PAGES = {"p1":{"empty":"v1"}};');
    expect(source).toContain('switchState');
    expect(source).toContain('stateTarget');
    expect(() => transformSync(source, { loader: 'jsx', format: 'esm' })).not.toThrow();
  });
});
