import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

beforeEach(() => {
  window.localStorage.clear();
  window.confirm = () => true;
});

describe('插件注册', () => {
  it('注册侧边栏入口与主页面两个 slot', () => {
    const { registered } = loadPlugin();
    const entry = registered.find((r) => r.slot === 'sidebar.panellist');
    const main = registered.find((r) => r.slot === 'main');
    expect(entry?.config?.id).toBe('dsh-product-design');
    expect(main?.config?.key).toBe('dsh-product-design');
    const cards = registered.find((r) => r.slot === 'conversation.chat.turnTail');
    expect(cards?.config?.id).toBe('dsh-product-design-cards');
  });

  it('侧边栏图标可渲染', () => {
    const { icon } = loadPlugin();
    const html = renderToStaticMarkup(React.createElement(icon, { size: 16 }));
    expect(html).toContain('<svg');
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
