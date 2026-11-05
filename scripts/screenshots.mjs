/**
 * Regenerate the README screenshots by mounting the real client bundle in
 * headless Chrome against a sample document. Run: `pnpm run screenshots`.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defaultConstraints } from '../src/shared/layout.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'screenshots');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!fs.existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}; set CHROME=/path/to/chrome`);
  process.exit(1);
}

// ------------------------------------------------------------------
// sample document
// ------------------------------------------------------------------
let seq = 0;
const el = (type, x, y, w, h, props = {}, extra = {}) => ({
  id: `shot${++seq}`,
  type,
  name: '',
  x,
  y,
  w,
  h,
  hidden: false,
  locked: false,
  opacity: 1,
  state: type === 'toggle' ? 'on' : type === 'checkbox' ? 'unchecked' : 'default',
  props,
  interactions: [],
  constraints: defaultConstraints(type),
  ...extra,
});
const page = (id, name, elements) => ({
  id,
  name,
  frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
  states: {
    loading: { text: '' },
    empty: { title: '', desc: '', action: '' },
    error: { title: '', desc: '', action: '' },
  },
  elements,
});

const login = page('p-login', '登录', [
  el('text', 24, 92, 342, 48, { text: 'Nimbus', fontSize: 34, fontWeight: 700, color: '#111827' }),
  el('text', 24, 148, 342, 24, {
    text: '登录以继续使用设计工作台',
    fontSize: 14,
    fontWeight: 400,
    color: '#6b7280',
  }),
  el('input', 24, 216, 342, 48, { text: '邮箱地址' }),
  el('input', 24, 280, 342, 48, { text: '密码' }),
  el(
    'button',
    24,
    352,
    342,
    48,
    { text: '登录', radius: 10 },
    {
      interactions: [{ trigger: 'click', action: 'navigate', targetPageId: 'p-home' }],
    },
  ),
  el('checkbox', 24, 420, 200, 24, { text: '记住我' }),
  el('image', 24, 476, 342, 170, {}),
  el('text', 24, 700, 342, 20, {
    text: '还没有账号？立即注册',
    fontSize: 12,
    fontWeight: 400,
    color: '#6366f1',
  }),
]);

const home = page('p-home', '首页', [
  el('navbar', 0, 0, 390, 56, { text: 'Nimbus' }),
  el('text', 24, 84, 250, 32, { text: '下午好，Alex', fontSize: 24, fontWeight: 700 }),
  el('text', 24, 122, 300, 20, {
    text: '今天想设计点什么？',
    fontSize: 13,
    fontWeight: 400,
    color: '#6b7280',
  }),
  el('badge', 300, 88, 66, 24, { text: 'PRO' }),
  el('card', 24, 162, 342, 124, { text: '本周项目' }),
  el(
    'container',
    24,
    306,
    342,
    196,
    {
      name: '快速开始',
      background: '#f8fafc',
      radius: 16,
    },
    {
      children: [
        el('text', 16, 14, 200, 24, { text: '快速开始', fontSize: 14, fontWeight: 600 }),
        el('image', 16, 48, 310, 96, {}),
        el('text', 16, 152, 280, 20, {
          text: '从模板开始搭建你的第一个原型',
          fontSize: 12,
          fontWeight: 400,
          color: '#6b7280',
        }),
      ],
    },
  ),
  el('tabs', 0, 540, 390, 48, { text: '推荐,关注,我的' }),
  el('image', 24, 608, 342, 140, {}),
]);

const detail = page('p-detail', '详情', [
  el('navbar', 0, 0, 390, 56, { text: '项目详情' }),
  el('image', 24, 80, 342, 200, {}),
  el('text', 24, 300, 342, 32, {
    text: 'Nimbus Design System',
    fontSize: 22,
    fontWeight: 700,
  }),
  el('text', 24, 340, 342, 44, {
    text: '一套用于快速搭建产品原型的组件与规范。',
    fontSize: 13,
    fontWeight: 400,
    color: '#6b7280',
  }),
  el('card', 24, 400, 342, 104, { text: '组件状态' }),
  el('text', 24, 530, 200, 24, { text: '启用预览', fontSize: 14, fontWeight: 500 }),
  el('toggle', 300, 528, 50, 28, {}),
  el(
    'button',
    24,
    590,
    342,
    48,
    { text: '开始编辑', radius: 10 },
    {
      interactions: [{ trigger: 'click', action: 'navigate', targetPageId: 'p-home' }],
    },
  ),
  el('select', 24, 660, 342, 48, { text: '选择环境' }),
  el('badge', 24, 728, 84, 24, { text: 'v1.3.0' }),
]);

const doc = { name: 'Nimbus', activePageId: 'p-home', pages: [login, home, detail] };

// ------------------------------------------------------------------
// harness page
// ------------------------------------------------------------------
const harness = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#fff}#app{height:100vh;width:100vw}</style>
</head><body><div id="app"></div>
<script src="__REACT__"></script>
<script src="__REACT_DOM__"></script>
<script>
  window.fetch = function(){ return new Promise(function(){}); };
  window.__ModuleLoader__ = { load: function(definition){ window.__dpd = definition; } };
  localStorage.setItem('dsh-product-design:doc:v3', ${JSON.stringify(JSON.stringify(doc))});
  localStorage.setItem('dsh-product-design:ui:v1', JSON.stringify({ section: 'pages', snapEnabled: true }));
</script>
<script src="__CLIENT__"></script>
<script>
  (function(){
    var React = window.React;
    var definition = window.__dpd;
    var api = definition.factory(function(name){ if (name === 'react') return React; throw new Error(name); });
    var registered = [];
    var slots = {
      inject: function(name, cb){ return cb(); },
      register: function(config, component){ registered.push({ slot: config.name, config: config, component: component }); return function(){}; }
    };
    var services = { layout: { selectPanel: function(){} } };
    var ctx = {
      get: function(name){ return services[name] || null; },
      effect: function(fn){ var d = fn(); return typeof d === 'function' ? d : function(){}; },
      slots: slots,
      inject: function(deps, cb){ return cb({ get: ctx.get, effect: ctx.effect, slots: slots }); }
    };
    api.apply(ctx);
    var main = registered.filter(function(r){ return r.slot === 'main'; })[0];
    ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(main.component));
    var view = new URLSearchParams(location.search).get('view');
    setTimeout(function(){
      var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
      var clickByTitle = function(title){
        var target = buttons.filter(function(b){ return b.title === title; })[0];
        if (target) target.click();
      };
      var clickByText = function(text){
        var target = buttons.filter(function(b){ return b.textContent.trim() === text; })[0];
        if (target) target.click();
      };
      if (view === 'components') clickByTitle('组件库');
      else if (view === 'layers') clickByTitle('图层');
      else if (view === 'export') clickByText('导出');
      else if (view === 'preview') clickByText('预览');
    }, 700);
  })();
</script>
</body></html>`;

// ------------------------------------------------------------------
// screenshots
// ------------------------------------------------------------------
const harnessFile = path.join(os.tmpdir(), 'dpd-screenshot-harness.html');
fs.writeFileSync(
  harnessFile,
  harness
    .replace(
      '__REACT__',
      pathToFileURL(path.join(root, 'node_modules/react/umd/react.production.min.js')).href,
    )
    .replace(
      '__REACT_DOM__',
      pathToFileURL(path.join(root, 'node_modules/react-dom/umd/react-dom.production.min.js')).href,
    )
    .replace('__CLIENT__', pathToFileURL(path.join(root, 'client.js')).href),
  'utf8',
);
const harnessUrl = pathToFileURL(harnessFile).href;

const shots = [
  ['editor-pages', 'pages'],
  ['editor-components', 'components'],
  ['editor-export', 'export'],
  ['preview', 'preview'],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [name, view] of shots) {
  const out = path.join(outDir, `${name}.png`);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dpd-shot-'));
  try {
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        '--allow-file-access-from-files',
        `--user-data-dir=${profile}`,
        '--window-size=1600,1000',
        '--force-device-scale-factor=1',
        '--virtual-time-budget=6000',
        `--screenshot=${out}`,
        `${harnessUrl}?view=${view}`,
      ],
      { stdio: 'ignore', timeout: 90000 },
    );
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
  if (!fs.existsSync(out)) throw new Error(`screenshot not written: ${out}`);
  console.log(`${name}.png  ${fs.statSync(out).size} bytes`);
}

fs.rmSync(harnessFile, { force: true });
