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

const page = (id, name) => ({
  id,
  name,
  frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
  elements: [],
});
const doc = (id, name) => ({ name: '', activePageId: id, pages: [page(id, name)] });
const jsonResponse = (status, body) => ({
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

function makeSource(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => ({ key: value }),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(next) {
      value = next;
      for (const fn of listeners) fn();
    },
  };
}

function mockFetch(url, init) {
  const u = new URL(String(url));
  const sid = u.searchParams.get('sessionId') || '';
  const method = init?.method || 'GET';
  fetchCalls.push({ url: u.toString(), sid, method });
  if (u.pathname.endsWith('/doc') && method === 'GET') {
    return Promise.resolve(jsonResponse(200, { revision: revisions[sid] || 0, doc: docs[sid] }));
  }
  if (u.pathname.endsWith('/doc') && method === 'POST') {
    revisions[sid] = (revisions[sid] || 0) + 1;
    const body = JSON.parse(init.body);
    if (body.doc) docs[sid] = body.doc;
    return Promise.resolve(
      jsonResponse(200, { ok: true, revision: revisions[sid], doc: docs[sid] }),
    );
  }
  return Promise.resolve(jsonResponse(404, { ok: false }));
}

class MockEventSource {
  constructor(url) {
    this.url = url;
  }
  close() {}
}

const pageRows = () => Array.from(container.querySelectorAll('.dpd-pageRow'));

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  docs = { s1: doc('p1', 'Session One'), s2: doc('p2', 'Session Two') };
  revisions = { s1: 1, s2: 1 };
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
  container.remove();
  globalThis.fetch = originalFetch;
  window.fetch = originalFetch;
  globalThis.EventSource = originalEs;
  window.EventSource = originalEs;
});

describe('多会话设计稿', () => {
  it('切换当前会话时加载该会话的设计稿', async () => {
    const source = makeSource('s1');
    const plugin = loadPlugin({ uiSession: { adapter: { current: source } } });
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(plugin.panel));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(
      pageRows()
        .map((row) => row.textContent)
        .join(' '),
    ).toContain('Session One');

    await act(async () => {
      source.set('s2');
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(
      pageRows()
        .map((row) => row.textContent)
        .join(' '),
    ).toContain('Session Two');
    expect(fetchCalls.some((c) => c.method === 'GET' && c.sid === 's1')).toBe(true);
    expect(fetchCalls.some((c) => c.method === 'GET' && c.sid === 's2')).toBe(true);
  });
});
