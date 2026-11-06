import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

beforeEach(() => {
  window.localStorage.clear();
  window.confirm = () => true;
});

describe('插件注册', () => {
  it('注册会话视图标签与主页面 slot，不再占用侧边栏', () => {
    const { registered } = loadPlugin();
    const view = registered.find((r) => r.slot === 'conversation.view');
    const main = registered.find((r) => r.slot === 'main');
    expect(view?.config?.id).toBe('dsh-product-design');
    expect(view?.config?.order).toBe(20);
    expect(view?.config?.label()).toBe('产品设计');
    expect(main?.config?.key).toBe('dsh-product-design');
    expect(registered.some((r) => r.slot === 'sidebar.panellist')).toBe(false);
    const cards = registered.find((r) => r.slot === 'conversation.chat.turnTail');
    expect(cards?.config?.id).toBe('dsh-product-design-cards');
    const hero = registered.find((r) => r.slot === 'conversation.hero.options');
    expect(hero?.config?.id).toBe('dsh-product-design.hero');
  });

  it('会话视图渲染画布，并提供全屏入口', () => {
    const { registered } = loadPlugin();
    const view = registered.find((r) => r.slot === 'conversation.view');
    const html = renderToStaticMarkup(React.createElement(view.component, { sessionId: '' }));
    expect(html).toContain('dpd-root');
    expect(html).toContain('dpd-embedded');
    expect(html).toContain('全屏');
    expect(html).not.toContain('返回会话');
  });
});

describe('面板渲染冒烟测试', () => {
  it('整树渲染包含工具栏 / 画布 / 画板 / 组件 / 页面列表', () => {
    // 产品默认 0 页，这里种一个只有单页的文档以覆盖整棵编辑树。
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
            elements: [
              {
                id: 'e1',
                type: 'text',
                name: '',
                x: 24,
                y: 40,
                w: 200,
                h: 28,
                hidden: false,
                locked: false,
                opacity: 1,
                state: 'default',
                props: { text: 'Hi' },
                interactions: [],
                constraints: { h: 'left', v: 'top' },
              },
            ],
          },
        ],
      }),
    );
    const { panel } = loadPlugin();
    const html = renderToStaticMarkup(React.createElement(panel));
    for (const marker of [
      'dpd-root',
      'dpd-toolbar',
      'dpd-canvas',
      'dpd-frame',
      'dpd-el',
      'dpd-pageRow',
      'dpd-libItem',
    ]) {
      expect(html, `缺少 ${marker}`).toContain(marker);
    }
    // 撤销 / 重做按钮存在
    expect(html).toContain('撤销');
    expect(html).toContain('重做');
  });

  it('没有任何页面时面板也能正常渲染（空白画布）', () => {
    const { panel } = loadPlugin();
    const html = renderToStaticMarkup(React.createElement(panel));
    expect(html).toContain('dpd-root');
    expect(html).toContain('dpd-toolbar');
    expect(html).toContain('dpd-canvas');
  });
});
