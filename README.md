# dsh-product-design

侧边栏里的「简化版 Figma」产品设计画布。用于产品设计需求沟通：在画布上直接搭原型，组件可交互、可切换状态，并预览整页的加载 / 空 / 错误状态。

> DSH 插件（DeepSeek Harness）。客户端半实现为无构建的原生 JS 模块，通过 `window.__ModuleLoader__` 挂载侧边栏入口与主页面。

## 功能

- **多画板并排**：所有页面横向排在可平移 / 缩放的画布上，每页独立尺寸（手机 390×844 / 平板 768×1024 / 桌面 1280×800）、背景与组件。
- **组件库（12 种）**：按钮、输入框、卡片、导航栏、标签页、开关、复选框、头像、文本、图片、徽标、下拉框；点击添加到当前页。
- **画布编辑**：组件可拖拽移动、右下角缩放、点选；支持复制、置顶、置底、删除、图层列表。
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

当前为**单文件客户端模块**，尚无构建步骤：

```text
dsh-product-design/
├─ index.js            # Host 半（当前不注册任何服务，仅为插件行占位）
├─ client.js           # 浏览器半：i18n / 模型 / 历史 / 组件 / 画布 / 属性面板 / 入口
├─ cordis.patch.yml    # bundle 补丁：插入插件行
├─ locale/{zh,en}.json # 插件元信息（标题 / 描述）
├─ icon.svg
├─ test/               # 行为回归测试（vitest + jsdom）
└─ package.json        # exports / dsh 声明 / engines / scripts / devDeps
```

`client.js` 内部逻辑分层（为后续拆分预留）：

- **i18n**：`DICT` + `useT()`，经 `ctx.get('locale')` 读取宿主语言。
- **模型 / 持久化**：`defaultDoc` / `normalizeDoc` / `loadDoc` / `saveDoc`，含 v1→v2 迁移。
- **历史**：`docRef` + `setDoc(updater, mode)` 的撤销 / 重做栈（拖拽、连续输入按动作合并）。
- **组件注册**：`TYPE_INFO` + `renderWidget(el, state, t)`。
- **画布**：多画板布局、缩放、网格、拖拽 / 缩放 / 平移、选择框。
- **UI**：Toolbar / LeftRail（页面 / 组件库 / 图层）/ Inspector。
- **入口**：`apply(ctx)` 注册 `sidebar.panellist` 与 `main` 两个 slot，并注册 locale 词条。

## 开发

```bash
pnpm install        # 安装开发依赖（测试 / lint 用）
pnpm run syntax     # node --check 语法检查
pnpm run test       # vitest 行为测试
pnpm run lint       # biome 检查 test 目录与配置
pnpm run check      # syntax + lint + test 一次跑完
```

插件通过 DSH profile 软链安装（`~/.dsh/profiles/desktop/node_modules/dsh-product-design -> 本目录`）。改动 `client.js` 后**刷新页面**即可加载；若宿主未热更，重启应用一次。

## 数据存储

- `dsh-product-design:doc:v2`：设计稿文档（页面、元素、状态）。
- `dsh-product-design:ui:v1`：界面偏好（左侧栏宽度、当前分区）。
- 旧 `dsh-product-design:doc:v1`（单画板）在加载时自动迁移为 `doc:v2` 的第 1 页。

## 版本与发布

- 语义化版本，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
- 当前 `private: true`，仅本地 profile 安装；如需发布 npm，改 `private: false` 并补充 `repository`。
- 兼容性通过 `engines.dsh` 与 `peerDependencies.react` 约束。

## 许可

MIT，见 [LICENSE](LICENSE)。
