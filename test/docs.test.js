import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;
let originalFetch;
let originalEs;
let fetchCalls;
let docs;
let activeDocId;
let revisions;

const makeDoc = (pageId, name) => ({
  name,
  activePageId: pageId,
  pages: [
    {
      id: pageId,
      name,
      frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
      states: {},
      elements: [],
    },
  ],
});

const jsonResponse = (status, body) => ({
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

function snapshot() {
  return {
    docId: activeDocId,
    revision: revisions[activeDocId] || 0,
    doc: docs.get(activeDocId),
  };
}

function meta(id) {
  const doc = docs.get(id);
  return { id, name: doc.name, pages: doc.pages.length, elements: 0, updatedAt: Date.now() };
}

function mockFetch(url, init) {
  const u = new URL(String(url), 'http://localhost');
  const method = init?.method || 'GET';
  fetchCalls.push({ path: u.pathname, method });
  const body = init?.body ? JSON.parse(init.body) : null;

  if (u.pathname.endsWith('/api/doc') && method === 'GET')
    return Promise.resolve(jsonResponse(200, snapshot()));
  if (u.pathname.endsWith('/api/doc') && method === 'POST') {
    docs.set(activeDocId, body.doc);
    revisions[activeDocId] = (revisions[activeDocId] || 0) + 1;
    return Promise.resolve(jsonResponse(200, { ok: true, ...snapshot() }));
  }
  if (u.pathname.endsWith('/api/docs') && method === 'GET') {
    return Promise.resolve(
      jsonResponse(200, {
        docs: [...docs.keys()].map(meta),
        activeDocId,
      }),
    );
  }
  if (u.pathname.endsWith('/api/docs') && method === 'POST') {
    const id = 'd' + (docs.size + 1);
    docs.set(id, body.doc);
    revisions[id] = 1;
    activeDocId = id;
    return Promise.resolve(jsonResponse(200, { meta: meta(id), snapshot: snapshot() }));
  }
  if (u.pathname.endsWith('/api/session/doc') && method === 'POST') {
    activeDocId = body.docId;
    return Promise.resolve(jsonResponse(200, snapshot()));
  }
  if (u.pathname.endsWith('/api/docs/rename') && method === 'POST') {
    const doc = docs.get(body.docId);
    doc.name = body.name;
    return Promise.resolve(jsonResponse(200, meta(body.docId)));
  }
  if (u.pathname.endsWith('/api/docs/duplicate') && method === 'POST') {
    const id = 'd' + (docs.size + 1);
    docs.set(id, JSON.parse(JSON.stringify(docs.get(body.docId))));
    return Promise.resolve(jsonResponse(200, meta(id)));
  }
  if (u.pathname.endsWith('/api/docs/delete') && method === 'POST') {
    docs.delete(body.docId);
    return Promise.resolve(jsonResponse(200, { ok: true, rebinds: [] }));
  }
  if (u.pathname.endsWith('/api/docs/export') && method === 'GET') {
    const id = u.searchParams.get('docId');
    return Promise.resolve(
      jsonResponse(200, { format: 'dsh-product-design', version: 1, doc: docs.get(id) }),
    );
  }
  return Promise.resolve(jsonResponse(404, { ok: false }));
}

class MockEventSource {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
  }
  close() {}
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  docs = new Map([
    ['d1', makeDoc('p1', 'Alpha')],
    ['d2', makeDoc('p2', 'Beta')],
  ]);
  activeDocId = 'd1';
  revisions = { d1: 1, d2: 1 };
  fetchCalls = [];
  originalFetch = globalThis.fetch;
  originalEs = globalThis.EventSource;
  globalThis.fetch = mockFetch;
  window.fetch = mockFetch;
  globalThis.EventSource = MockEventSource;
  window.EventSource = MockEventSource;

  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  const plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
  await act(wait);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  container.remove();
  globalThis.fetch = originalFetch;
  window.fetch = originalFetch;
  globalThis.EventSource = originalEs;
  window.EventSource = originalEs;
});

describe('设计稿库面板', () => {
  it('列出 Host 上的设计稿，点击可切换当前会话的稿子', async () => {
    const rail = container.querySelector('button[title="设计稿"]');
    expect(rail).toBeTruthy();
    await act(async () => {
      rail.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(wait);

    const rows = Array.from(container.querySelectorAll('.dpd-docRow'));
    expect(rows.map((row) => row.textContent).join(' ')).toContain('Alpha');
    expect(rows.map((row) => row.textContent).join(' ')).toContain('Beta');

    const beta = rows.find((row) => row.textContent.includes('Beta'));
    await act(async () => {
      beta.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(wait);

    expect(fetchCalls.some((c) => c.path.endsWith('/api/session/doc') && c.method === 'POST')).toBe(
      true,
    );
    const label = container.querySelector('.dpd-pageLabel .pin');
    expect(label && label.textContent).toContain('Beta');
  });

  it('新建设计稿后切到新稿，列表刷新', async () => {
    await act(async () => {
      container
        .querySelector('button[title="设计稿"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(wait);

    const create = Array.from(container.querySelectorAll('.dpd-docBar .dpd-btn')).find((btn) =>
      btn.textContent.includes('新建'),
    );
    expect(create).toBeTruthy();
    await act(async () => {
      create.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(wait);

    expect(fetchCalls.some((c) => c.path.endsWith('/api/docs') && c.method === 'POST')).toBe(true);
    const rows = Array.from(container.querySelectorAll('.dpd-docRow'));
    expect(rows.length).toBe(3);
  });

  it('重命名当前稿会调用 Host 并刷新名称', async () => {
    await act(async () => {
      container
        .querySelector('button[title="设计稿"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(wait);

    const name = container.querySelector('.dpd-docRow .nm');
    await act(async () => {
      name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    const input = container.querySelector('.dpd-docRow .nmInput');
    expect(input).toBeTruthy();
    await act(async () => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc?.set) desc.set.call(input, 'Renamed');
      else input.value = 'Renamed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await act(wait);

    expect(fetchCalls.some((c) => c.path.endsWith('/api/docs/rename'))).toBe(true);
  });
});

describe('图片组件', () => {
  const imageDoc = () => ({
    name: 'Image',
    activePageId: 'p1',
    pages: [
      {
        id: 'p1',
        name: 'P',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        states: {},
        elements: [
          {
            id: 'img1',
            type: 'image',
            name: '',
            x: 0,
            y: 0,
            w: 120,
            h: 80,
            hidden: false,
            locked: false,
            opacity: 1,
            state: 'default',
            props: { src: 'https://example.com/logo.png', fit: 'contain' },
            interactions: [],
            constraints: { h: 'left', v: 'top' },
          },
        ],
      },
    ],
  });

  it('属性面板可编辑图片地址与填充方式', async () => {
    activeDocId = 'dimg';
    docs.set('dimg', imageDoc());
    revisions.dimg = 1;
    await act(async () => {
      root.unmount();
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    const plugin = loadPlugin();
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(plugin.panel));
    });
    await act(wait);

    const img =
      container.querySelector('img[src="https://example.com/logo.png"]') ||
      container.querySelector('.dpd-el img');
    expect(img).toBeTruthy();

    await act(async () => {
      img.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    const right = container.querySelector('.dpd-right');
    expect(right.textContent).toContain('图片');
    const inputs = Array.from(right.querySelectorAll('input[type="text"]'));
    const srcInput = inputs.find((input) => input.value === 'https://example.com/logo.png');
    expect(srcInput).toBeTruthy();
    await act(async () => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc?.set) desc.set.call(srcInput, 'https://example.com/v2.png');
      else srcInput.value = 'https://example.com/v2.png';
      srcInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const stored = JSON.parse(window.localStorage.getItem('dsh-product-design:doc:v3'));
    expect(stored.pages[0].elements[0].props.src).toBe('https://example.com/v2.png');
  });
});
