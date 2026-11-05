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
