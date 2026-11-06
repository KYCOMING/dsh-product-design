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
let revisions;
let activeDocId;
let nextId;

const page = (id, name) => ({
  id,
  name,
  frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
  states: {},
  elements: [],
});
const docWithPage = (id, name, pageName) => ({
  name,
  activePageId: id,
  pages: [page(id, pageName)],
});
const emptyDoc = () => ({ name: '', pages: [], activePageId: null });

const jsonResponse = (status, body) => ({
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});
const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

function metaOf(id) {
  const doc = docs.get(id) || {};
  const pages = Array.isArray(doc.pages) ? doc.pages.filter((p) => !p.variantOf) : [];
  return {
    id,
    name: typeof doc.name === 'string' ? doc.name : '',
    pages: pages.length,
    elements: pages.reduce((n, p) => n + (Array.isArray(p.elements) ? p.elements.length : 0), 0),
    updatedAt: Date.now(),
  };
}

function snapshot() {
  return {
    docId: activeDocId,
    revision: revisions[activeDocId] || 0,
    doc: docs.get(activeDocId) || emptyDoc(),
  };
}

function mockFetch(url, init) {
  const u = new URL(String(url), 'http://localhost');
  const method = init?.method || 'GET';
  fetchCalls.push({ path: u.pathname, method });
  const body = init?.body ? JSON.parse(init.body) : null;

  if (u.pathname.endsWith('/api/doc') && method === 'GET') {
    return Promise.resolve(jsonResponse(200, snapshot()));
  }
  if (u.pathname.endsWith('/api/doc') && method === 'POST') {
    if (body.doc) docs.set(activeDocId, body.doc);
    revisions[activeDocId] = (revisions[activeDocId] || 0) + 1;
    return Promise.resolve(jsonResponse(200, { ok: true, ...snapshot() }));
  }
  if (u.pathname.endsWith('/api/docs') && method === 'GET') {
    return Promise.resolve(jsonResponse(200, { docs: [...docs.keys()].map(metaOf), activeDocId }));
  }
  if (u.pathname.endsWith('/api/docs') && method === 'POST') {
    const id = 'd' + nextId++;
    docs.set(id, body.doc);
    revisions[id] = 1;
    activeDocId = id;
    return Promise.resolve(jsonResponse(200, { meta: metaOf(id), snapshot: snapshot() }));
  }
  if (u.pathname.endsWith('/api/docs/delete') && method === 'POST') {
    const id = body.docId;
    docs.delete(id);
    revisions[id] = 0;
    const rebinds = [];
    if (id === activeDocId) {
      const nid = 'd' + nextId++;
      docs.set(nid, emptyDoc());
      revisions[nid] = 0;
      activeDocId = nid;
      rebinds.push({ sessionId: 's1', docId: nid });
    }
    return Promise.resolve(jsonResponse(200, { ok: true, rebinds }));
  }
  if (u.pathname.endsWith('/api/docs/rename') && method === 'POST') {
    const doc = docs.get(body.docId);
    if (doc) doc.name = body.name;
    return Promise.resolve(jsonResponse(200, metaOf(body.docId)));
  }
  if (u.pathname.endsWith('/api/session/doc') && method === 'POST') {
    activeDocId = body.docId;
    return Promise.resolve(jsonResponse(200, snapshot()));
  }
  return Promise.resolve(jsonResponse(404, { ok: false }));
}

class MockEventSource {
  constructor(url) {
    this.url = url;
  }
  close() {}
}

// Minimal uiSession adapter: exposes a `title` projection via keyedHooks.
function makeSessionSource(sessionId, title) {
  const face = {
    getSnapshot: () => title,
    subscribe: () => () => {},
  };
  return {
    adapter: {
      current: {
        getSnapshot: () => ({
          key: sessionId,
          hooks: {},
          keyedHooks: { projection: (key) => (key === 'title' ? face : null) },
        }),
        subscribe: () => () => {},
      },
    },
  };
}

async function mount(uiSession) {
  const plugin = loadPlugin({ uiSession });
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
  await act(async () => {
    await wait(60);
  });
}

async function openDesigns() {
  const rail = container.querySelector('button[title="设计稿"]');
  await act(async () => {
    rail.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await wait(40);
  });
}

const docRows = () => Array.from(container.querySelectorAll('.dpd-docRow'));

beforeEach(() => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  nextId = 10;
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
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  root = null;
  container.remove();
  globalThis.fetch = originalFetch;
  window.fetch = originalFetch;
  globalThis.EventSource = originalEs;
  window.EventSource = originalEs;
});

describe('自动创建的设计稿命名', () => {
  it('首次打开会话时，自动生成的空白稿保持未命名，不用会话标题命名', async () => {
    docs = new Map([['d1', emptyDoc()]]);
    activeDocId = 'd1';
    revisions = { d1: 0 };

    await mount(makeSessionSource('s1', '登录页设计'));

    expect(docs.get('d1').name).toBe('');
    // 新稿默认没有页面，且不会被自动套用会话标题。
    expect(docs.get('d1').pages.length).toBe(0);
    const nameInput = container.querySelector('.dpd-nameInput');
    expect(nameInput.value).toBe('');

    await openDesigns();
    const listed = docRows()
      .map((row) => row.textContent)
      .join(' ');
    expect(listed).toContain('未命名设计稿');
    expect(listed).not.toContain('登录页设计');
  });

  it('手动新建的设计稿不会被自动改名', async () => {
    docs = new Map([['d1', docWithPage('p1', '已有稿', '首页')]]);
    activeDocId = 'd1';
    revisions = { d1: 1 };

    await mount(makeSessionSource('s1', '登录页设计'));
    await openDesigns();

    const create = Array.from(container.querySelectorAll('.dpd-docBar .dpd-btn')).find((btn) =>
      btn.textContent.includes('新建'),
    );
    await act(async () => {
      create.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await wait(120);
    });

    expect(fetchCalls.some((c) => c.path.endsWith('/api/docs') && c.method === 'POST')).toBe(true);
    const created = docs.get(activeDocId);
    expect(created).toBeTruthy();
    expect(created.name).toBe(''); // manual create keeps an untitled draft
    const newRow = docRows().find((row) => row.textContent.includes('未命名设计稿'));
    expect(newRow).toBeTruthy();
    expect(newRow.textContent).not.toContain('登录页设计');
  });
});

describe('删除设计稿', () => {
  it('当前正在使用的设计稿不能删除，并提示用户', async () => {
    docs = new Map([['d1', docWithPage('p1', '重要稿', '旧首页')]]);
    activeDocId = 'd1';
    revisions = { d1: 3 };

    await mount(makeSessionSource('s1', '会话甲'));
    await openDesigns();

    const row = docRows().find((item) => item.textContent.includes('重要稿'));
    const del = row.querySelector('button[title="删除设计稿"]');
    await act(async () => {
      del.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await wait(120);
    });

    // No delete request was issued, the draft is untouched and still listed.
    expect(fetchCalls.some((c) => c.path.endsWith('/api/docs/delete'))).toBe(false);
    expect(docs.has('d1')).toBe(true);
    expect(docs.get('d1').name).toBe('重要稿');
    expect(
      docRows()
        .map((item) => item.textContent)
        .join(' '),
    ).toContain('重要稿');
    // A visible reminder is shown.
    expect(container.textContent).toContain('当前设计稿已被选中，无法删除');
  });

  it('删除其他设计稿正常工作并从列表移除', async () => {
    docs = new Map([
      ['d1', docWithPage('p1', '当前稿', '当前页')],
      ['d2', docWithPage('p2', '另一稿', '另一页')],
    ]);
    activeDocId = 'd1';
    revisions = { d1: 1, d2: 1 };

    await mount(makeSessionSource('s1', '会话甲'));
    await openDesigns();
    expect(
      docRows()
        .map((item) => item.textContent)
        .join(' '),
    ).toContain('另一稿');

    const row = docRows().find((item) => item.textContent.includes('另一稿'));
    const del = row.querySelector('button[title="删除设计稿"]');
    await act(async () => {
      del.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await wait(120);
    });

    expect(fetchCalls.some((c) => c.path.endsWith('/api/docs/delete'))).toBe(true);
    expect(docs.has('d2')).toBe(false);
    const rowsText = docRows()
      .map((item) => item.textContent)
      .join(' ');
    expect(rowsText).not.toContain('另一稿');
    expect(rowsText).toContain('当前稿');
  });
});
