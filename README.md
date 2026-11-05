# dsh-product-design

侧边栏里的「简化版 Figma」产品设计画布。用于产品设计需求沟通：在画布上直接搭原型，组件可交互、可切换状态，并预览整页的加载 / 空 / 错误状态。

> DSH 插件（DeepSeek Harness）。客户端半由 `src/client` 构建为单文件模块，通过 `window.__ModuleLoader__` 挂载侧边栏入口与主页面。

## 安装

> 目前只通过 GitHub 分发，**未发布 npm**。`package.json` 保留 `private: true` 是故意的，避免误发布；GitHub 安装使用仓库里已提交的构建产物，不需要在本地构建，也不需要批准依赖构建脚本。

```bash
# Desktop
dsh plugin --profile desktop add github:KYCOMING/dsh-product-design

# Web
dsh plugin --profile web add github:KYCOMING/dsh-product-design
```

没有 `dsh` 命令时：打开 **插件 → 添加插件**，输入 `github:KYCOMING/dsh-product-design`。

安装后在「插件」页确认 `dsh-product-design` 已启用，然后重启 DSH（Host 半不会热加载）。侧边栏出现「产品设计」图标。

卸载：

```bash
dsh plugin --profile desktop remove dsh-product-design
```

### 兼容性

| DSH 版本 | 状态 |
| --- | --- |
| 0.2.2-rc.1 | ✅ 实测 |
| 0.2.0-rc.1 – 0.2.x | ⚠️ `engines.dsh` 允许，未逐一实测 |
| < 0.2.0 / >= 0.3.0 | ❌ 未声明支持 |

### 权限与数据

- 在 Host 进程内注册同源 HTTP 路由 `/dsh-product-design/api`，提供文档读写与 SSE 变更推送。
- 设计稿写入 `<DSH_HOME>/storages/dsh-product-design/sessions/<sessionId>/doc.json`；浏览器端另用 `localStorage` 做缓存/离线兜底。
- 注册两个 agent 工具（`product_design_get_document` / `product_design_apply`）、一段系统提示和 `/design` 命令。
- 不发起外部网络请求，不收集遥测。

## 截图

> 示例设计稿「Nimbus」：登录、首页、详情三个画板。

### 编辑器：多画板、页面树与属性面板

![编辑器](docs/screenshots/editor-pages.png)

### 组件库：13 类组件，点击添加到当前页

![组件库](docs/screenshots/editor-components.png)

### 纯净预览：隐藏编辑器 UI，只保留产品画板

![预览模式](docs/screenshots/preview.png)

## 功能

- **多画板并排**：所有页面横向排在可平移 / 缩放的画布上，每页独立尺寸（手机 390×844 / 平板 768×1024 / 桌面 1280×800）、背景与组件。
- **组件库（13 种）**：容器、按钮、输入框、卡片、导航栏、标签页、开关、复选框、头像、文本、图片、徽标、下拉框；点击添加到当前页。
- **容器与编组**：容器可嵌套任意组件并裁剪超出内容；拖入 / 拖出容器自动改变层级。多选后可 `⌘G` 编组、`⇧⌘G` 取消编组，容器/编组随子元素整体移动。
- **多选与对齐**：`Shift + 点击` 多选、画板空白处拖拽框选；属性面板支持左/中/右、上/中/下对齐与水平/垂直分布。
- **磁吸对齐**：拖动 / 缩放时自动吸附画板边缘、画板中心线、其他元素边缘与中心，并显示洋红参考线；顶部「磁吸」开关可关闭。
- **画布编辑**：组件可拖拽移动、8 向手柄缩放、点选；支持复制、置顶、置底、删除、图层树（容器子元素缩进显示）。
- **自适应尺寸**：切换画板尺寸（手机/平板/桌面）时，当前页组件按宽比/高比分别缩放（x、宽按宽比；y、高按高比）铺满新画板，切回原尺寸可还原；字号/圆角取较小比例。
- **组件状态**：每个组件有独立状态集（如按钮 默认/悬停/按下/禁用，输入框 默认/聚焦/已填写/错误/禁用…），在右侧属性面板切换预览。
- **预览模式**：一键进入「只看产品」的干净视图——隐藏工具栏与左右侧栏、只显示当前画板、不显示网格与页面标签；组件真实响应悬停 / 按下 / 点击，开关、复选框、标签页、下拉可交互。`Esc` 或右上角「退出预览」返回编辑器。
- **页面状态**：顶部「正常 / 加载中 / 空状态 / 错误」一键切换整页效果。
- **网格 + 缩放**：画布小方格网格随缩放变化；`Ctrl/⌘ + 滚轮` 缩放，普通滚轮滚动。
- **编辑体验**：撤销 / 重做、键盘快捷键、空格 / 中键拖拽平移画布；左右侧栏均可拖拽调节宽度，右侧属性栏还可一键收起为窄条，避免遮挡画布。
- **对话内产品预览（Visualize 风格）**：AI 调用 `product_design_apply` 后，聊天回合末尾会出现当前页面的产品缩略卡片，可一键「打开画布」；无需先手动打开画布。
- **多会话独立设计稿**：每个会话拥有自己的设计稿；切换会话时画布自动切换，互不覆盖。旧版单稿会自动迁移到首个打开画布的会话。
- **自动保存**：设计稿持久化到 Host（按会话分目录）和 `localStorage`（`doc:v2:<sessionId>`，旧 `doc:v1` 自动迁移为第 1 页）。

## 快捷键

| 快捷键                        | 作用                                |
| ----------------------------- | ----------------------------------- |
| `⌘Z` / `Ctrl+Z`               | 撤销                                |
| `⇧⌘Z` / `Ctrl+Shift+Z`、`⌘Y`  | 重做                                |
| `Delete` / `Backspace`        | 删除选中组件                        |
| `← → ↑ ↓`                     | 微移 1px（`Shift` + 方向键 = 10px） |
| `⌘D` / `Ctrl+D`               | 复制选中组件                        |
| `⌘G` / `Ctrl+G`               | 编组选中组件                        |
| `⇧⌘G` / `Ctrl+Shift+G`        | 取消编组                            |
| `Shift + 点击`                | 多选 / 取消多选                     |
| `Esc`                         | 取消选中 / 退出预览                 |
| `Space` + 拖拽 / 鼠标中键拖拽 | 平移画布                            |

## 命令

| 命令 | 作用 |
| --- | --- |
| `/design <需求>` | 提交一条产品设计需求，作为普通用户消息交给 AI，由 AI 调用画布工具生成/修改设计 |

`/design` 实现：Host 半通过 `ctx.commands.register({ name: 'design', input: { hint: '<需求>' }, ... })` 注册；handler 将 `rawInput` 包装成普通用户消息并通过 `agent.followup()` 提交，因此 AI 会正常走产品设计工具链，而不是由命令直接改文档。

## 架构

双半插件：`src/` 是源码，`client.js` / `index.js` 是 esbuild 产出的**可加载单文件**（DSH 客户端只接受单文件模块）。

```text
dsh-product-design/
├─ src/
│  ├─ client/                 # 浏览器半（按职责拆分）
│  │  ├─ index.js             # 入口：apply(ctx) 注册 slot / locale / 对话内卡片
│  │  ├─ react.js             # React 与 h 的极薄适配
│  │  ├─ constants.js         # NS / PANEL_ID / 存储键 / 组件注册表 / GAP
│  │  ├─ i18n.js              # DICT + useT / pickDict
│  │  ├─ color.js             # 颜色工具
│  │  ├─ widgets.js           # renderWidget：12 类组件 + 容器预览渲染
│  │  ├─ icons.js             # 图标 + 侧边栏 glyph
│  │  ├─ styles.js            # 画布 CSS
│  │  ├─ model.js             # 文档模型 / localStorage / Host API 调用
│  │  ├─ overlay.js           # 页面状态浮层
│  │  ├─ panel.js             # 编辑器容器：状态 / 撤销历史 / 事件处理
│  │  ├─ cards.js             # 对话内产品预览卡片（Visualize 风格）
│  │  ├─ session.js           # 跟随当前会话的 active-session 订阅
│  │  └─ ui/                  # 展示层子组件（纯渲染 + 回调）
│  │     ├─ toolbar.js        #   顶部工具栏
│  │     ├─ left.js           #   活动栏 + 页面/组件库/图层分区
│  │     ├─ canvas.js         #   多画板画布
│  │     └─ inspector.js      #   右侧属性面板
│  ├─ shared/                 # 浏览器 / Host 共用纯逻辑
│  │  ├─ elements.js           #   元素树遍历、父子关系、包围盒、深拷贝
│  │  └─ snapping.js           #   磁吸几何（边缘/中心吸附 + 参考线）
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

- **数据**：`<DSH_HOME>/storages/dsh-product-design/sessions/<sessionId>/doc.json`（默认 `~/.dsh/...`），每个会话一份，含 `revision` 与 `doc`；旧版全局 `doc.json` 会迁移到首个打开画布的会话。
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

开发时可以把本目录链接进 profile（`dsh plugin --profile desktop add /absolute/path/to/dsh-product-design`）；公开安装方式见上文「安装」。

## 数据存储

- **Host 权威**：`<DSH_HOME>/storages/dsh-product-design/sessions/<sessionId>/doc.json`（`{ revision, doc }`），按会话隔离、供 AI 工具读写；无会话上下文时退回旧版全局 `doc.json`。
- `dsh-product-design:doc:v2:<sessionId>`：浏览器端 **按会话缓存/离线兜底**（Host 不可达时使用；首次连接时若 Host 为空则作为种子上报）。
- `dsh-product-design:ui:v1`：界面偏好（左右侧栏宽度、当前分区、磁吸开关）。
- 旧 `dsh-product-design:doc:v1`（单画板）在加载时自动迁移为 `doc:v2` 的第 1 页。

## 版本与发布

- 语义化版本，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
- 当前只通过 GitHub 分发，不发布 npm；`private: true` 是故意保留的。
- 发布流程：更新 `CHANGELOG.md` 与 `package.json` → `pnpm run build` → 提交 → 打 annotated tag `vX.Y.Z` → `git push origin vX.Y.Z` → 创建 GitHub Release。
- 兼容性通过 `engines.dsh` 约束；`peerDependencies.react` 由 DSH 客户端注入。

## 许可

MIT，见 [LICENSE](LICENSE)。
