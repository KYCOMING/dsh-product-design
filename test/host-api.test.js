// @vitest-environment node
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let home;
const routes = [];
const tools = [];
let ctx;
let apply;

class Req extends EventEmitter {
  constructor(method, url) {
    super();
    this.method = method;
    this.url = url;
    this.headers = {};
  }
}

function call(method, url, body) {
  const req = new Req(method, url);
  const res = {
    status: 0,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers || {};
    },
    write(chunk) {
      this.body += chunk;
      return true;
    },
    end(chunk) {
      if (chunk) this.body += chunk;
    },
    once() {},
  };
  const handler = routes[0].handler;
  const done = Promise.resolve(handler(req, res));
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
  return done.then(() => ({ status: res.status, json: res.body ? JSON.parse(res.body) : null }));
}

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), 'dpd-host-'));
  process.env.DSH_HOME = home;
  const mod = await import('../index.js');
  apply = mod.apply;
  const scopeTools = {
    register(tool) {
      tools.push(tool);
      return () => {};
    },
  };
  ctx = {
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    effect(fn) {
      const d = fn();
      return typeof d === 'function' ? d : () => {};
    },
    get(name) {
      return name === 'tools' ? scopeTools : undefined;
    },
    inject(_deps, cb) {
      cb({
        tools: scopeTools,
        get: (name) => (name === 'tools' ? scopeTools : undefined),
        effect: (fn) => {
          const d = fn();
          return typeof d === 'function' ? d : () => {};
        },
      });
    },
  };
  apply(ctx);
});

afterAll(() => {
  if (home) rmSync(home, { recursive: true, force: true });
  delete process.env.DSH_HOME;
});

describe('host API + tools', () => {
  it('注册 prefix 路由与两个工具', () => {
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ kind: 'prefix', path: '/dsh-product-design/api' });
    expect(tools.map((t) => t.name).sort()).toEqual([
      'product_design_apply',
      'product_design_get_document',
    ]);
  });

  it('GET /doc 初始为空 → POST 播种 → GET 读到', async () => {
    const before = await call('GET', '/dsh-product-design/api/doc');
    expect(before.status).toBe(200);
    expect(before.json.doc).toBeNull();

    const seed = { name: 'demo', activePageId: null, pages: [] };
    const post = await call('POST', '/dsh-product-design/api/doc', { baseRevision: 0, doc: seed });
    expect(post.status).toBe(200);
    expect(post.json.revision).toBe(1);

    const after = await call('GET', '/dsh-product-design/api/doc');
    expect(after.json.doc.name).toBe('demo');
  });

  it('陈旧 baseRevision 触发 409 冲突', async () => {
    const conflict = await call('POST', '/dsh-product-design/api/doc', {
      baseRevision: 0,
      doc: { pages: [] },
    });
    expect(conflict.status).toBe(409);
    expect(conflict.json.conflict).toBe(true);
    expect(conflict.json.revision).toBe(1);
  });

  it('工具 product_design_apply 直接改动宿主文档', async () => {
    const tool = tools.find((t) => t.name === 'product_design_apply');
    const out = await tool.execute({
      operations: [
        { kind: 'add_page', name: '首页' },
        { kind: 'add_element', type: 'button', props: { text: '开始' } },
      ],
    });
    expect(out.ok).toBe(true);
    const got = await call('GET', '/dsh-product-design/api/doc');
    expect(got.json.doc.pages[0].name).toBe('首页');
    expect(got.json.doc.pages[0].elements[0].props.text).toBe('开始');
  });

  it('POST /apply 与非法操作', async () => {
    const ok = await call('POST', '/dsh-product-design/api/apply', {
      operations: [{ kind: 'add_element', type: 'card' }],
    });
    expect(ok.status).toBe(200);
    expect(ok.json.ok).toBe(true);

    const bad = await call('POST', '/dsh-product-design/api/apply', {
      operations: [{ kind: 'nope' }],
    });
    expect(bad.status).toBe(400);
    expect(bad.json.ok).toBe(false);
  });
});
