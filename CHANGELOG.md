# Changelog

本文件记录 dsh-product-design 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- **容器（Container）**：新增 `container` 元素类型，支持嵌套子元素、背景/圆角/裁剪内容；拖动组件进出容器自动重挂载；图层树按层级缩进显示。
- **编组 / 取消编组**：`⌘G` / `⇧⌘G`（属性面板按钮同样可用），多选后生成 `group` 容器，子元素保持相对坐标。
- **磁吸对齐（Smart guides）**：拖动 / 8 向缩放时吸附画板边缘、画板中心线、其他元素边缘与中心，显示洋红参考线；顶部「磁吸」开关可关闭。
- **多选与对齐**：`Shift + 点击` 多选、画板空白处框选；属性面板新增左/中/右、上/中/下对齐与水平/垂直分布。
- **8 向缩放**：选中组件后显示 8 个缩放手柄（原仅右下角），缩放同样支持磁吸。
- 切换画板尺寸（手机/平板/桌面）时按宽比/高比分别缩放当前页组件（可还原；坐标/宽高/字号/圆角），修复桌面切手机后组件不缩放、溢出画板的问题；Host 的 `set_page_frame` 同样支持（`scaleElements:false` 可关闭）。
- **宿主权威文档 + AI 可编程画布**：Host 半 (`index.js` + `host-model.js`) 持有设计稿、持久化到 `<DSH_HOME>/storages/dsh-product-design/doc.json`，提供同源 HTTP API（`/doc` GET/POST、`/apply`、`/events` SSE）与两个 agent 工具 `product_design_get_document`、`product_design_apply`（支持 add/update/delete 页面与元素、设置状态与属性）。客户端从 Host 拉取并订阅变更，本地编辑 debounce 回写；Host 不可用时退回 localStorage。另向模型注册一段系统提示，说明画布与工具用法。
- 新增 `/canvas` 客户端命令：在 composer 通过 `/` 菜单或直接输入 `/canvas` 打开画布（`ctx.commandUi` 动作命令 + `ctx.layout.selectPanel`）。
- 工程化骨架：git 仓库、`.gitignore` / `.editorconfig` / `.nvmrc`、README / CHANGELOG / CONTRIBUTING / LICENSE。
- `package.json` 补充 `engines`、`peerDependencies`、`scripts`、`devDependencies`。
- 行为回归测试入库（vitest + jsdom）：插件注册、整树渲染、撤销/重做、快捷键、拖拽、平移。
- Biome 格式化 / 检查与 GitHub Actions CI。

### Changed
- **工程化重构**：源码迁入 `src/`（`src/client/*` 职责模块 + `src/client/ui/{toolbar,left,canvas,inspector}.js` 展示层 + `src/shared/*` 共用几何 + `src/host/{index,model}.js`），用 esbuild（`scripts/build.mjs`）打包回单文件 `client.js` / `index.js`；新增 `pnpm run build`，`pretest` 自动构建；Host 的 `host-model.js` 迁至 `src/host/model.js`。

## [1.0.0] - 2026-11-04

### Added
- 多画板并排画布：页面新增 / 复制 / 删除 / 切换，每页独立尺寸、背景与组件。
- 12 类组件库；组件拖拽移动、右下角缩放、选中框。
- 组件状态切换（按钮 / 输入框 / 卡片 / 开关 / 复选框 / 下拉等）与预览模式交互。
- 页面级状态预览：正常 / 加载中 / 空状态 / 错误。
- 左侧活动栏（页面 / 组件库 / 图层）+ 可拖拽调宽的分区面板。
- 画布网格与 `Ctrl/⌘ + 滚轮` 缩放。
- 撤销 / 重做（工具栏按钮 + 快捷键）、方向键微移、`Delete` 删除、`⌘D` 复制、`Esc` 取消选中。
- 空格 / 中键拖拽平移画布。
- 设计稿 localStorage 持久化，`doc:v1` → `doc:v2` 自动迁移。
