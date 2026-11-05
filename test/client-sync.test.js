import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

let container;
let root;
let plugin;
let hostDoc;
let hostRevision;
let fetchCalls;
let esInstance;
let originalFetch;
let originalEs;

const page = (id, name) => ({
  id,
  name,
  frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
  elements: [],
});
const docWith = (pages) => ({ name: '', activePageId: pages[0]?.id ?? null, pages });

const jsonResponse = (status, body) => ({
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

function mockFetch(url, init) {
  const u = String(url);
  const method = init?.method || 'GET';
  fetchCalls.push({ url: u, method });
  if (u.endsWith('/doc') && method === 'GET') {
    return Promise.resolve(jsonResponse(200, { revision: hostRevision, doc: hostDoc }));
  }
  if (u.endsWith('/doc') && method === 'POST') {
    hostRevision += 1;
    const body = JSON.parse(init.body);
    if (body.doc) hostDoc = body.doc;
    return Promise.resolve(jsonResponse(200, { ok: true, revision: hostRevision, doc: hostDoc }));
  }
  return Promise.resolve(jsonResponse(404, { ok: false }));
}

class MockEventSource {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    esInstance = this;
  }
  close() {}
}

const pageRows = () => container.querySelectorAll('.dpd-pageRow');

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  hostRevision = 0;
  hostDoc = docWith([page('p1', 'HostPage')]);
  fetchCalls = [];
  esInstance = null;
  originalFetch = globalThis.fetch;
  originalEs = globalThis.EventSource;
  globalThis.fetch = mockFetch;
  window.fetch = mockFetch;
  globalThis.EventSource = MockEventSource;
  window.EventSource = MockEventSource;

  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
  // Let the mount effect's async Host GET + EventSource subscription settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  globalThis.fetch = originalFetch;
  window.fetch = originalFetch;
  globalThis.EventSource = originalEs;
  window.EventSource = originalEs;
});

describe('客户端从 Host 加载并实时同步', () => {
  it('挂载时用 Host 文档覆盖本地默认稿', () => {
    expect(fetchCalls.some((c) => c.method === 'GET' && c.url.endsWith('/doc'))).toBe(true);
    expect(pageRows()).toHaveLength(1);
    expect(pageRows()[0].textContent).toContain('HostPage');
    expect(esInstance).not.toBeNull();
  });

  it('收到 SSE 变更后重新拉取并渲染 AI 的新页面', async () => {
    expect(pageRows()).toHaveLength(1);

    // Simulate the host (an agent tool call) advancing the document.
    hostRevision = 2;
    hostDoc = docWith([page('p1', 'HostPage'), page('p2', 'AISecond')]);

    await act(async () => {
      esInstance.onmessage({ data: JSON.stringify({ revision: 2 }) });
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(pageRows()).toHaveLength(2);
    expect(pageRows()[1].textContent).toContain('AISecond');
  });

  it('AI 改动可以通过撤销回退', async () => {
    expect(pageRows()).toHaveLength(1);
    hostRevision = 2;
    hostDoc = docWith([page('p1', 'HostPage'), page('p2', 'AISecond')]);
    await act(async () => {
      esInstance.onmessage({ data: JSON.stringify({ revision: 2 }) });
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(pageRows()).toHaveLength(2);

    const undo = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('title') === '撤销 (⌘Z)',
    );
    expect(undo.disabled).toBe(false);
    await act(async () => {
      undo.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(pageRows()).toHaveLength(1);
  });

  it('本地编辑会把文档回写 Host（POST /doc）', async () => {
    const addBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('title') === '新增页',
    );
    expect(addBtn).toBeTruthy();
    await act(async () => {
      addBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    // debounce is 400ms
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    const posts = fetchCalls.filter((c) => c.method === 'POST' && c.url.endsWith('/doc'));
    expect(posts.length).toBeGreaterThan(0);
  });
});
