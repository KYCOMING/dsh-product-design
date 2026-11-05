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
let conflictNext;
let remoteDoc;
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
    return Promise.resolve(
      jsonResponse(200, { docId: 'd1', revision: hostRevision, doc: hostDoc }),
    );
  }
  if (u.endsWith('/doc') && method === 'POST') {
    const body = JSON.parse(init.body);
    if (conflictNext) {
      conflictNext = false;
      return Promise.resolve(
        jsonResponse(409, { ok: false, conflict: true, docId: 'd1', revision: 5, doc: remoteDoc }),
      );
    }
    hostRevision = (body.baseRevision || 0) + 1;
    if (body.doc) hostDoc = body.doc;
    return Promise.resolve(
      jsonResponse(200, { ok: true, docId: 'd1', revision: hostRevision, doc: hostDoc }),
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

const addPageButton = () =>
  Array.from(container.querySelectorAll('button')).find(
    (b) => b.getAttribute('title') === '新增页',
  );
const syncLabel = () => container.querySelector('.dpd-saved');

async function wait(ms) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

beforeEach(async () => {
  window.localStorage.clear();
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  hostRevision = 1;
  hostDoc = docWith([page('p1', 'HostPage')]);
  remoteDoc = docWith([page('r1', 'RemotePage')]);
  conflictNext = false;
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
  plugin = loadPlugin();
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(plugin.panel));
  });
  await wait(30);
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

describe('保存状态与冲突', () => {
  it('Host 同步成功后显示「已保存」，本地编辑期间显示「保存中」', async () => {
    expect(syncLabel().textContent).toBe('已保存');
    await act(async () => {
      addPageButton().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(syncLabel().textContent).toBe('保存中…');
    await wait(500);
    expect(syncLabel().textContent).toBe('已保存');
  });

  it('409 不覆盖本地，显示冲突条；选择保留本地会重试写入', async () => {
    conflictNext = true;
    await act(async () => {
      addPageButton().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    await wait(500);

    const bar = container.querySelector('.dpd-syncBar');
    expect(bar).toBeTruthy();
    expect(bar.textContent).toContain('保存冲突');
    // Local document must still be on screen.
    expect(Array.from(container.querySelectorAll('.dpd-pageRow')).length).toBe(2);
    expect(syncLabel().textContent).toBe('有冲突');

    const keep = Array.from(bar.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === '保留我的改动',
    );
    await act(async () => {
      keep.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    await wait(50);

    expect(container.querySelector('.dpd-syncBar')).toBeNull();
    expect(syncLabel().textContent).toBe('已保存');
    expect(hostDoc.pages.map((p) => p.name)).toContain('页面 2');
  });

  it('冲突时选择远端版本会用远端文档替换本地', async () => {
    conflictNext = true;
    await act(async () => {
      addPageButton().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    await wait(500);

    const bar = container.querySelector('.dpd-syncBar');
    const useRemote = Array.from(bar.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === '使用远端版本',
    );
    await act(async () => {
      useRemote.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    await wait(50);

    expect(container.querySelector('.dpd-syncBar')).toBeNull();
    expect(
      Array.from(container.querySelectorAll('.dpd-pageRow'))
        .map((r) => r.textContent)
        .join(' '),
    ).toContain('RemotePage');
  });
});
