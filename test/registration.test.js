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
});
