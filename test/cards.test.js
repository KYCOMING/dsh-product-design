import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  activateDesignTab,
  foldCard,
  ProductDesignCard,
  ProductPagePreview,
  productDesignMetaFrom,
  turnCardsDefinition,
} from '../src/client/cards.js';

const page = {
  id: 'p1',
  name: '登录页',
  frame: { w: 390, h: 844, background: '#ffffff' },
  elements: [
    {
      id: 'c1',
      type: 'container',
      x: 20,
      y: 20,
      w: 300,
      h: 200,
      state: 'default',
      props: { name: '卡片', background: '#fff', clipContent: true },
      children: [
        {
          id: 'b1',
          type: 'button',
          x: 10,
          y: 10,
          w: 100,
          h: 40,
          state: 'default',
          props: { text: '登录' },
        },
      ],
    },
  ],
};

const meta = {
  kind: 'product-design',
  title: '登录页',
  pageId: 'p1',
  pageIndex: 0,
  pageCount: 1,
  page,
};

describe('产品设计 Visualize 卡片', () => {
  it('识别并渲染页面缩略图', () => {
    expect(productDesignMetaFrom(meta)).toBe(meta);
    const html = renderToStaticMarkup(React.createElement(ProductDesignCard, { meta }));
    expect(html).toContain('登录页');
    expect(html).toContain('登录');
    expect(html).toContain('打开画布');
    expect(renderToStaticMarkup(React.createElement(ProductPagePreview, { page }))).toContain(
      '登录',
    );
  });

  it('同页卡片会替换而不是重复', () => {
    const a = { callId: 'a', seq: 1, meta };
    const b = { callId: 'b', seq: 2, meta: { ...meta, title: '登录页 2' } };
    expect(foldCard([a], b)).toHaveLength(1);
    expect(foldCard([a], b)[0].callId).toBe('b');
  });

  it('「打开画布」优先切换到会话内的产品设计选项卡', () => {
    document.body.innerHTML =
      '<div data-conversation-tabs>' +
      '<button type="button" role="tab">对话</button>' +
      '<button type="button" role="tab">产品设计</button>' +
      '</div>';
    let clicked = 0;
    document.querySelectorAll('button')[1].addEventListener('click', () => {
      clicked += 1;
    });
    expect(activateDesignTab()).toBe(true);
    expect(clicked).toBe(1);
    document.body.innerHTML = '';
    // 没有选项卡时返回 false，让调用方回退到全屏。
    expect(activateDesignTab()).toBe(false);
  });

  it('回合事件会收集 apply 结果里的产品预览', () => {
    const started = turnCardsDefinition.start(
      {},
      {
        event: { type: 'turn/start', data: { turn: 7 } },
      },
    );
    const updated = turnCardsDefinition.update(
      { state: started },
      {
        event: {
          type: 'tool/result',
          seq: 9,
          data: {
            message: { isError: false, source: { callId: 'call-1' } },
            meta,
          },
        },
      },
    );
    expect(updated.cards).toHaveLength(1);
    expect(updated.cards[0].meta.pageId).toBe('p1');
  });
});
