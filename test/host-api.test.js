// @vitest-environment node
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let home;
const routes = [];
const tools = [];
const sections = [];
const commands = [];
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
  const commandService = {
    register(command) {
      commands.push(command);
      return () => {};
    },
  };
  const scopeOf = () => ({
    tools: scopeTools,
    systemPrompt,
    commands: commandService,
    get: (name) => {
      if (name === 'tools') return scopeTools;
      if (name === 'systemPrompt') return systemPrompt;
      if (name === 'commands') return commandService;
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
      if (name === 'commands') return commandService;
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

  it('/design 命令把需求作为普通用户消息提交给 Agent', async () => {
    const command = commands.find((item) => item.name === 'design');
    expect(command).toBeTruthy();
    expect(command.input).toEqual({ hint: '<需求>' });
    let followed = null;
    const result = command.handler({
      agent: {
        followup(message) {
          followed = message;
        },
      },
      rawInput: '画一个登录页',
      attachments: [],
    });
    expect(result.kind).toBe('success');
    expect(followed.role).toBe('user');
    expect(followed.content[0].text).toBe('画一个登录页');
    expect(command.handler({ agent: { followup() {} }, rawInput: '  ' }).kind).toBe('error');
  });

  it('GET /doc 为新会话自动建稿 → POST 播种 → GET 读到', async () => {
    const before = await call('GET', '/dsh-product-design/api/doc');
    expect(before.status).toBe(200);
    expect(before.json.docId).toBeTruthy();
    expect(before.json.doc.pages).toEqual([]);

    const seed = { name: 'demo', activePageId: null, pages: [] };
    const post = await call('POST', '/dsh-product-design/api/doc', {
      baseRevision: before.json.revision,
      docId: before.json.docId,
      doc: seed,
    });
    expect(post.status).toBe(200);
    expect(post.json.revision).toBe(1);

    const after = await call('GET', '/dsh-product-design/api/doc');
    expect(after.json.doc.name).toBe('demo');
    expect(after.json.docId).toBe(before.json.docId);
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
    const meta = await tool.output.presentationMeta({}, out);
    expect(meta.kind).toBe('product-design');
    expect(meta.page.elements[0].children).toHaveLength(1);
  });

  it('按 sessionId 隔离设计稿', async () => {
    const a = 'session-a-isolation';
    const b = 'session-b-isolation';
    const docFor = (id, name) => ({
      name,
      activePageId: id,
      pages: [
        {
          id,
          name,
          frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
          elements: [],
        },
      ],
    });
    const firstA = await call('GET', `/dsh-product-design/api/doc?sessionId=${a}`);
    expect(firstA.status).toBe(200);
    const writeA = await call('POST', `/dsh-product-design/api/doc?sessionId=${a}`, {
      baseRevision: firstA.json.revision,
      doc: docFor('pa', 'Session A'),
    });
    expect(writeA.status).toBe(200);

    const firstB = await call('GET', `/dsh-product-design/api/doc?sessionId=${b}`);
    expect(firstB.status).toBe(200);
    await call('POST', `/dsh-product-design/api/doc?sessionId=${b}`, {
      baseRevision: firstB.json.revision,
      doc: docFor('pb', 'Session B'),
    });

    const readA = await call('GET', `/dsh-product-design/api/doc?sessionId=${a}`);
    const readB = await call('GET', `/dsh-product-design/api/doc?sessionId=${b}`);
    expect(readA.json.doc.name).toBe('Session A');
    expect(readB.json.doc.name).toBe('Session B');
  });

  it('sessionId 不能通过 .. 逃出 sessions 目录', async () => {
    const before = await call('GET', '/dsh-product-design/api/doc?sessionId=..');
    const res = await call('POST', '/dsh-product-design/api/doc?sessionId=..', {
      baseRevision: before.json.revision,
      doc: { name: 'traversal', pages: [] },
    });
    expect(res.status).toBe(200);
    const bindingFile = join(
      home,
      'storages',
      'dsh-product-design',
      'sessions',
      'default',
      'active.json',
    );
    expect(existsSync(bindingFile)).toBe(true);
    const bound = JSON.parse(readFileSync(bindingFile, 'utf8')).docId;
    const safeFile = join(home, 'storages', 'dsh-product-design', 'docs', `${bound}.json`);
    expect(existsSync(safeFile)).toBe(true);
    expect(JSON.parse(readFileSync(safeFile, 'utf8')).doc.name).toBe('traversal');
    const escapedFile = join(home, 'storages', 'dsh-product-design', 'doc.json');
    if (existsSync(escapedFile)) {
      expect(JSON.parse(readFileSync(escapedFile, 'utf8')).doc.name).not.toBe('traversal');
    }
  });

  it('工具按执行会话读写各自的画布', async () => {
    const applyToolDef = tools.find((t) => t.name === 'product_design_apply');
    const getToolDef = tools.find((t) => t.name === 'product_design_get_document');
    const exec = (id) => ({ agent: { session: { header: { id } } } });

    await applyToolDef.execute(
      { operations: [{ kind: 'add_page', name: 'Tool A' }] },
      exec('session-tool-a'),
    );
    await applyToolDef.execute(
      { operations: [{ kind: 'add_page', name: 'Tool B' }] },
      exec('session-tool-b'),
    );
    const gotA = await getToolDef.execute({}, exec('session-tool-a'));
    const gotB = await getToolDef.execute({}, exec('session-tool-b'));
    expect(gotA.doc.pages.map((p) => p.name)).toContain('Tool A');
    expect(gotA.doc.pages.map((p) => p.name)).not.toContain('Tool B');
    expect(gotB.doc.pages.map((p) => p.name)).toContain('Tool B');
  });

  it('POST /apply 与非法操作', async () => {
    const ok = await call('POST', '/dsh-product-design/api/apply', {
      operations: [{ kind: 'add_page' }, { kind: 'add_element', type: 'card' }],
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

describe('设计稿库', () => {
  const page = (id, name) => ({
    id,
    name,
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    elements: [],
  });

  it('新建 / 列表 / 重命名 / 复制 / 导出 / 导入 / 切换 / 删除', async () => {
    const sid = 'docs-session';
    const created = await call('POST', '/dsh-product-design/api/docs', {
      sessionId: sid,
      doc: { name: 'Draft', activePageId: 'dp1', pages: [page('dp1', 'Draft page')] },
    });
    expect(created.status).toBe(200);
    const id = created.json.meta.id;
    expect(id).toBeTruthy();
    expect(created.json.snapshot.docId).toBe(id);

    const listed = await call('GET', `/dsh-product-design/api/docs?sessionId=${sid}`);
    expect(listed.status).toBe(200);
    expect(listed.json.activeDocId).toBe(id);
    expect(listed.json.docs.some((d) => d.id === id)).toBe(true);

    const renamed = await call('POST', '/dsh-product-design/api/docs/rename', {
      docId: id,
      name: 'Renamed',
    });
    expect(renamed.json.name).toBe('Renamed');

    const dup = await call('POST', '/dsh-product-design/api/docs/duplicate', { docId: id });
    expect(dup.json.id).not.toBe(id);
    expect(dup.json.name).toBe('Renamed copy');

    const exported = await call(
      'GET',
      `/dsh-product-design/api/docs/export?docId=${encodeURIComponent(id)}`,
    );
    expect(exported.status).toBe(200);
    expect(exported.json.format).toBe('dsh-product-design');
    expect(exported.json.doc.name).toBe('Renamed');

    const imported = await call('POST', '/dsh-product-design/api/docs/import', {
      payload: exported.json,
      name: 'Imported',
    });
    expect(imported.json.name).toBe('Imported');

    const switched = await call('POST', '/dsh-product-design/api/session/doc', {
      sessionId: sid,
      docId: dup.json.id,
    });
    expect(switched.json.docId).toBe(dup.json.id);
    expect(switched.json.doc.name).toBe('Renamed copy');

    const del = await call('POST', '/dsh-product-design/api/docs/delete', { docId: dup.json.id });
    expect(del.json.ok).toBe(true);
    expect(del.json.rebinds.some((r) => r.sessionId === sid)).toBe(true);

    const after = await call('GET', `/dsh-product-design/api/doc?sessionId=${sid}`);
    expect(after.json.docId).not.toBe(dup.json.id);
  });

  it('切稿后旧 docId 的写入返回 409，不会写进新稿', async () => {
    const sid = 'docs-stale';
    const first = await call('POST', '/dsh-product-design/api/docs', {
      sessionId: sid,
      doc: { name: 'First', activePageId: 'p1', pages: [page('p1', 'First')] },
    });
    const second = await call('POST', '/dsh-product-design/api/docs', {
      sessionId: sid,
      doc: { name: 'Second', activePageId: 'p2', pages: [page('p2', 'Second')] },
    });
    const current = await call('GET', `/dsh-product-design/api/doc?sessionId=${sid}`);
    expect(current.json.docId).toBe(second.json.meta.id);

    const stale = await call('POST', `/dsh-product-design/api/doc?sessionId=${sid}`, {
      baseRevision: current.json.revision,
      docId: first.json.meta.id,
      doc: { name: 'Stale', activePageId: 'p1', pages: [page('p1', 'Stale')] },
    });
    expect(stale.status).toBe(409);
    const still = await call('GET', `/dsh-product-design/api/doc?sessionId=${sid}`);
    expect(still.json.doc.name).toBe('Second');
  });
});
