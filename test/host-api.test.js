// @vitest-environment node
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let home;
const routes = [];
const tools = [];
const sections = [];
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
  const systemPrompt = {
    section(spec) {
      sections.push(spec);
      return () => {};
    },
  };
  const scopeOf = () => ({
    tools: scopeTools,
    systemPrompt,
    get: (name) => {
      if (name === 'tools') return scopeTools;
      if (name === 'systemPrompt') return systemPrompt;
      return undefined;
    },
    effect: (fn) => {
      const d = fn();
      return typeof d === 'function' ? d : () => {};
    },
  });
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
      if (name === 'tools') return scopeTools;
      if (name === 'systemPrompt') return systemPrompt;
      return undefined;
    },
    inject(_deps, cb) {
      cb(scopeOf());
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

  it('注册模型提示段（工具可见时）', () => {
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('plugin:dsh-product-design');
    expect(sections[0].text).toContain('product_design_apply');
  });

  it('工具定义满足 dsh-tools 注册契约（output.render + 受支持的 JSON Schema 子集）', () => {
    // Mirrors the real registry's checks: output.render must be a function and
    // schemas may only use the supported keyword subset.
    const ALLOWED = new Set([
      'type',
      'oneOf',
      'properties',
      'required',
      'additionalProperties',
      'items',
      'enum',
      'const',
      'description',
      'title',
    ]);
    const walk = (node, path) => {
      expect(
        node && typeof node === 'object' && !Array.isArray(node),
        `${path} must be an object`,
      ).toBe(true);
      for (const key of Object.keys(node)) {
        expect(ALLOWED.has(key), `${path}.${key} is not a supported keyword`).toBe(true);
        if (key === 'properties') {
          for (const [k, v] of Object.entries(node.properties)) walk(v, `${path}.properties.${k}`);
        }
        if (key === 'items') walk(node.items, `${path}.items`);
        if (key === 'oneOf') {
          for (const [i, v] of node.oneOf.entries()) walk(v, `${path}.oneOf[${i}]`);
        }
      }
    };
    for (const tool of tools) {
      expect(typeof tool.output.render, `${tool.name}.output.render`).toBe('function');
      walk(tool.output.schema, `${tool.name}.output.schema`);
      walk(tool.parameters, `${tool.name}.parameters`);
      expect(tool.parameters.type).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
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

  it('工具支持容器、@last 嵌套与编组操作', async () => {
    const tool = tools.find((t) => t.name === 'product_design_apply');
    const out = await tool.execute({
      operations: [
        { kind: 'add_page', name: '容器页' },
        { kind: 'add_container', pageId: '@last', name: '卡片' },
        {
          kind: 'add_element',
          pageId: '@last',
          containerId: '@last',
          type: 'button',
          props: { text: 'OK' },
        },
      ],
    });
    expect(out.ok).toBe(true);
    const got = await call('GET', '/dsh-product-design/api/doc');
    const page = got.json.doc.pages.find((p) => p.name === '容器页');
    expect(page).toBeTruthy();
    expect(page.elements[0].type).toBe('container');
    expect(page.elements[0].children[0].props.text).toBe('OK');
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

  it('真实 HTTP 服务上 GET /doc 与 POST /apply 可用', async () => {
    const server = createServer((req, res) => routes[0].handler(req, res));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const getRes = await fetch(`http://127.0.0.1:${port}/dsh-product-design/api/doc`);
      expect(getRes.status).toBe(200);
      const body = await getRes.json();
      expect(body.doc).toBeTruthy();

      const postRes = await fetch(`http://127.0.0.1:${port}/dsh-product-design/api/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operations: [{ kind: 'set_document_name', name: 'RealHTTP' }] }),
      });
      expect(postRes.status).toBe(200);
      const applied = await postRes.json();
      expect(applied.ok).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
