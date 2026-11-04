# dsh-product-design

侧边栏里的「简化版 Figma」产品设计画布。用于产品设计需求沟通：在画布上直接搭原型，组件可交互、可切换状态，并预览整页的加载 / 空 / 错误状态。

> DSH 插件（DeepSeek Harness）。客户端半实现为无构建的原生 JS 模块，通过 `window.__ModuleLoader__` 挂载侧边栏入口与主页面。

## 功能

- **多画板并排**：所有页面横向排在可平移 / 缩放的画布上，每页独立尺寸（手机 390×844 / 平板 768×1024 / 桌面 1280×800）、背景与组件。
- **组件库（12 种）**：按钮、输入框、卡片、导航栏、标签页、开关、复选框、头像、文本、图片、徽标、下拉框；点击添加到当前页。
- **画布编辑**：组件可拖拽移动、右下角缩放、点选；支持复制、置顶、置底、删除、图层列表。
- **自适应尺寸**：切换画板尺寸（手机/平板/桌面）时，当前页组件按等比适配（`min(宽比,高比)`）一起缩放，字号/圆角同比，避免切换后组件溢出或错位。
- **组件状态**：每个组件有独立状态集（如按钮 默认/悬停/按下/禁用，输入框 默认/聚焦/已填写/错误/禁用…），在右侧属性面板切换预览。
- **预览模式**：组件真实响应悬停 / 按下 / 点击，开关、复选框、标签页、下拉可交互。
- **页面状态**：顶部「正常 / 加载中 / 空状态 / 错误」一键切换整页效果。
- **网格 + 缩放**：画布小方格网格随缩放变化；`Ctrl/⌘ + 滚轮` 缩放，普通滚轮滚动。
- **编辑体验**：撤销 / 重做、键盘快捷键、空格 / 中键拖拽平移画布。
- **`/canvas` 命令**：在对话输入框输入 `/` 后选「产品设计画布」，或直接输入 `/canvas` 回车，即可打开画布（无需鼠标点侧边栏）。
- **自动保存**：设计稿持久化到 `localStorage`（`doc:v2`，旧 `doc:v1` 自动迁移为第 1 页）。

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `⌘Z` / `Ctrl+Z` | 撤销 |
| `⇧⌘Z` / `Ctrl+Shift+Z`、`⌘Y` | 重做 |
| `Delete` / `Backspace` | 删除选中组件 |
| `← → ↑ ↓` | 微移 1px（`Shift` + 方向键 = 10px） |
| `⌘D` / `Ctrl+D` | 复制选中组件 |
| `Esc` | 取消选中 / 退出预览 |
| `Space` + 拖拽 / 鼠标中键拖拽 | 平移画布 |

## 命令

| 命令 | 作用 |
| --- | --- |
| `/canvas` | 打开产品设计画布（`/` 菜单中显示为「产品设计画布」） |

实现：通过客户端命令面 `ctx.commandUi.register(...)` 注册一个 `kind: 'action'` 的贡献项，执行时调用 `ctx.layout.selectPanel('dsh-product-design')` 选中本插件注册的 `main` 面板。

## 架构

双半插件：`src/` 是源码，`client.js` / `index.js` 是 esbuild 产出的**可加载单文件**（DSH 客户端只接受单文件模块）。

```text
dsh-product-design/
├─ src/
│  ├─ client/                 # 浏览器半（按职责拆分）
│  │  ├─ index.js             # 入口：apply(ctx) 注册 slot / locale / /canvas 命令
│  │  ├─ react.js             # React 与 h 的极薄适配
│  │  ├─ constants.js         # NS / PANEL_ID / 存储键 / 组件注册表 / GAP
│  │  ├─ i18n.js              # DICT + useT / pickDict
│  │  ├─ color.js             # 颜色工具
│  │  ├─ widgets.js           # renderWidget：12 类组件渲染
│  │  ├─ icons.js             # 图标 + 侧边栏 glyph
│  │  ├─ styles.js            # 画布 CSS
│  │  ├─ model.js             # 文档模型 / localStorage / Host API 调用
│  │  ├─ overlay.js           # 页面状态浮层
│  │  ├─ panel.js             # 编辑器容器：状态 / 撤销历史 / 事件处理
│  │  └─ ui/                  # 展示层子组件（纯渲染 + 回调）
│  │     ├─ toolbar.js        #   顶部工具栏
│  │     ├─ left.js           #   活动栏 + 页面/组件库/图层分区
│  │     ├─ canvas.js         #   多画板画布
│  │     └─ inspector.js      #   右侧属性面板
│  └─ host/
│     ├─ index.js             # Host 半：store / HTTP / agent 工具 / prompt
│     └─ model.js             # Host 文档 reducer（纯函数，可单测）
├─ scripts/build.mjs          # esbuild：src → client.js + index.js
├─ client.js   index.js       # 构建产物（提交入库，loader 直接读；勿手改）
├─ cordis.patch.yml
├─ locale/{zh,en}.json
├─ icon.svg
├─ test/                      # vitest + jsdom / node 回归测试
└─ package.json
```

- `client.js`：esbuild `format=cjs` 打包后，用 `window.__ModuleLoader__.load({ id, factory })` 包装；`react` 保持 external，由 loader 的 `require('react')` 注入。
- `index.js`：esbuild 打 Node ESM（内联 `src/host/model.js`）。
- 职责边界：`model.js` 只管文档/持久化；`widgets.js` 纯渲染；`i18n/constants/color` 无副作用；撤销/重做在 `panel.js`（`docRef` + `setDoc(mode)`）；`host/model.js` 是与 UI 无关的纯 reducer。

## AI 可编程画布（宿主权威）

设计稿的所有权在 **Host**，浏览器只是视图，因此模型可以通过工具直接读写画布：

- **数据**：`<DSH_HOME>/storages/dsh-product-design/doc.json`（默认 `~/.dsh/...`），含 `revision` 与 `doc`。
- **HTTP 路由**（同源，前缀 `/dsh-product-design/api`）：
  - `GET /doc` → `{ revision, doc }`
  - `POST /doc` → `{ baseRevision, doc }`（乐观并发，版本不匹配返回 409 + 当前文档）
  - `POST /apply` → `{ operations: [...] }`（服务端 reducer）
  - `GET /events` → SSE，每次变更推送 `{ revision }`
- **Agent 工具**（`ctx.get('tools').register`）：
  - `product_design_get_document`：读取当前文档（页面 / 元素 / 状态 / 属性）。
  - `product_design_apply`：按顺序应用操作，返回生成的 page/element id 与新 revision。支持 `add_page` / `delete_page` / `rename_page` / `set_page_frame` / `clear_page` / `add_element` / `update_element` / `delete_element` / `set_document_name`；页面可用 `pageId`、`"@last"` 或 `pageIndex` 定位。
- **模型提示段**：通过 `ctx.systemPrompt.section` 注册说明，告诉模型画布与工具、坐标系与组件/状态清单，以及“先 get 再单次 apply 批量搭建”。
- **同步**：客户端 GET + SSE 拉取 Host 变更；本地编辑 400ms debounce 回写；冲突以 409 让客户端采纳服务端版本。Host 不可用时自动退回 localStorage 单机模式。
- **安全**：路由复用 Host 的 `connection.requestRejection` 同源护栏（若有）；默认仅本机回环绑定。

## 开发

```bash
pnpm install
pnpm run build      # src/ → client.js + index.js（改完 src 必须重新构建）
pnpm run test       # vitest（pretest 会自动 build）
pnpm run lint       # biome 检查 src / scripts / test
pnpm run check      # build + syntax + lint + test 一次跑完
```

> `client.js`、`index.js` 是构建产物，**不要手改**；改 `src/**` 后 `pnpm run build`，刷新页面即可。改了 Host 半（`index.js`）需要重启 Harness 让宿主重新加载。

插件通过 DSH profile 软链安装（`~/.dsh/profiles/desktop/node_modules/dsh-product-design -> 本目录`）。

## 数据存储

- **Host 权威**：`<DSH_HOME>/storages/dsh-product-design/doc.json`（`{ revision, doc }`），跨会话持久、供 AI 工具读写。
- `dsh-product-design:doc:v2`：浏览器端 **缓存/离线兜底**（Host 不可达时使用；首次连接时若 Host 为空则作为种子上报）。
- `dsh-product-design:ui:v1`：界面偏好（左侧栏宽度、当前分区）。
- 旧 `dsh-product-design:doc:v1`（单画板）在加载时自动迁移为 `doc:v2` 的第 1 页。

## 版本与发布

- 语义化版本，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
- 当前 `private: true`，仅本地 profile 安装；如需发布 npm，改 `private: false` 并补充 `repository`。
- 兼容性通过 `engines.dsh` 与 `peerDependencies.react` 约束。

## 许可

MIT，见 [LICENSE](LICENSE)。
