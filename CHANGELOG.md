# Changelog

本文件记录 dsh-product-design 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- **原型交互（页面跳转）**：元素支持 `interactions: [{ action: navigate|back|openOverlay, targetPageId }]`，右侧属性面板可增删改；预览里点击即可走通流程，带返回栈与弹层，`Esc` 逐层退出。
- **双击就地编辑文本**：画布上双击文本类组件直接编辑，`Enter` 提交、`Shift+Enter` 换行、`Esc` 取消，字号/字重/颜色/对齐实时套用。
- **图层操作**：拖拽排序、拖入容器、显隐、锁定、双击重命名、按名称搜索。
- **剪贴板**：`⌘C` / `⌘X` / `⌘V`，保留元素在画布上的绝对位置，可跨页粘贴；选中容器时粘贴进容器。
- **右键菜单**：复制 / 剪切 / 粘贴 / 副本 / 层级（置顶、置底、上移、下移）/ 编组 / 显隐 / 锁定 / 删除。
- **面包屑**：画布左上角显示 `页面 › 容器 › 元素`，可逐级点选。
- **多选批量改属性**：颜色、字号、圆角、不透明度一次应用到全部选中图层。
- **悬停轮廓**：编辑态悬停即高亮元素边界，容器内元素更容易点中。
- **页面状态文案可编辑**：`page.states.{loading,empty,error}` 的标题/说明/按钮文案在属性面板可改，AI 也可通过 `set_page_states` 写入；不再是一层写死的蒙层。
- **Host 新操作**：`duplicate_page`、`set_active_page`、`set_page_states`、`move_element`（换父容器且保持屏幕位置）、`reorder_element`（front/back/forward/backward）；`update_element` 支持 `name/hidden/locked/opacity/interactions`。
- 新增回归测试：就地编辑、图层显隐、剪贴板、右键删除、原型跳转/弹层、AI 改动撤销。

### Changed
- **文档格式升到 v3（破坏性，不做兼容）**：元素新增 `name / hidden / locked / opacity / interactions`，页面新增 `states`；localStorage 键改为 `dsh-product-design:doc:v3`。移除 v1→v2 迁移、半宽文档自愈 `repairDoc`、旧全局 `doc.json` 迁移等全部兼容代码。
- **切画板尺寸默认缩放内容，可关闭**：`set_page_frame` 与画板预设默认按宽高比例缩放当前页元素（`scaleElements:false` 可保持原位）；右侧「画布设置」新增「切换画板尺寸时缩放内容」开关，记忆到 UI 偏好。
- **AI 改动可撤销**：Host 通过 SSE 推来的文档变更会作为独立历史步骤记录，`⌘Z` 可回退；自己保存的回声不会产生多余步骤。
- **图层面板默认行为**：容器子元素按层级缩进，隐藏元素仍可在图层树里选中与恢复。
- `package.json` 的 `description` 改为中英文双语，与 GitHub About 保持一致。
- README 增加画板截图：编辑器多画板、组件库、纯净预览。

## [1.1.0] - 2026-11-05

### Added
- **多会话独立设计稿**：Host 按 `sessions/<sessionId>/doc.json` 存储；客户端跟随当前会话加载/保存，切换会话不会覆盖其他会话的设计稿。旧版全局 `doc.json` 自动迁移到首个打开画布的会话。
- **`/design <需求>` 命令**：Host 命令接收产品设计需求并通过 `agent.followup()` 提交为普通用户消息，由 AI 调用 `product_design_apply` 绘制。
- **对话内产品预览（Codex Visualize 风格）**：`product_design_apply` / `product_design_get_document` 的结果附带 `presentationMeta`，客户端在聊天回合末尾渲染当前页面的产品缩略卡片，支持「打开画布」。AI 收到需求并修改文档后，用户无需手动跳转就能看到结果。
- **右侧属性栏可拖拽调宽 + 收起**：宽度会记忆到 `dsh-product-design:ui:v1`，并限制最大占可用宽度的 36%；标题栏「»」可收起为窄条、「«」展开，避免遮挡画布。
- **纯净预览**：进入预览时隐藏工具栏与左右侧栏，只保留当前产品画板（无网格/页面标签），支持右上角「退出预览」或 `Esc` 返回。
- **容器（Container）**：新增 `container` 元素类型，支持嵌套子元素、背景/圆角/裁剪内容；拖动组件进出容器自动重挂载；图层树按层级缩进显示。
- **编组 / 取消编组**：`⌘G` / `⇧⌘G`（属性面板按钮同样可用），多选后生成 `group` 容器，子元素保持相对坐标。
- **磁吸对齐（Smart guides）**：拖动 / 8 向缩放时吸附画板边缘、画板中心线、其他元素边缘与中心，显示洋红参考线；顶部「磁吸」开关可关闭。
- **多选与对齐**：`Shift + 点击` 多选、画板空白处框选；属性面板新增左/中/右、上/中/下对齐与水平/垂直分布。
- **8 向缩放**：选中组件后显示 8 个缩放手柄（原仅右下角），缩放同样支持磁吸。
- 切换画板尺寸（手机/平板/桌面）时按宽比/高比分别缩放当前页组件（可还原；坐标/宽高/字号/圆角），修复桌面切手机后组件不缩放、溢出画板的问题；Host 的 `set_page_frame` 同样支持（`scaleElements:false` 可关闭）。
- **宿主权威文档 + AI 可编程画布**：Host 半 (`index.js` + `host-model.js`) 持有设计稿、持久化到 `<DSH_HOME>/storages/dsh-product-design/doc.json`，提供同源 HTTP API（`/doc` GET/POST、`/apply`、`/events` SSE）与两个 agent 工具 `product_design_get_document`、`product_design_apply`（支持 add/update/delete 页面与元素、设置状态与属性）。客户端从 Host 拉取并订阅变更，本地编辑 debounce 回写；Host 不可用时退回 localStorage。另向模型注册一段系统提示，说明画布与工具用法。
- **移除 `/canvas` 客户端命令**：画布不再需要手动跳转，侧边栏入口和 `/design` 已覆盖使用场景。
- 工程化骨架：git 仓库、`.gitignore` / `.editorconfig` / `.nvmrc`、README / CHANGELOG / CONTRIBUTING / LICENSE。
- `package.json` 补充 `engines`、`peerDependencies`、`scripts`、`devDependencies`。
- 行为回归测试入库（vitest + jsdom）：插件注册、整树渲染、撤销/重做、快捷键、拖拽、平移。
- Biome 格式化 / 检查与 GitHub Actions CI。

### Changed
- **工程化重构**：源码迁入 `src/`（`src/client/*` 职责模块 + `src/client/ui/{toolbar,left,canvas,inspector}.js` 展示层 + `src/shared/*` 共用几何 + `src/host/{index,model}.js`），用 esbuild（`scripts/build.mjs`）打包回单文件 `client.js` / `index.js`；新增 `pnpm run build`，`pretest` 自动构建；Host 的 `host-model.js` 迁至 `src/host/model.js`。
- **分发方式改为 GitHub 直装**：本版本不发布 npm，`package.json` 保留 `private: true`；README 补充 GitHub 安装、兼容性、权限与数据说明。
- **兼容范围收窄**：`engines.dsh` 从 `>=0.1.6` 调整为 `>=0.2.0-rc.1 <0.3.0-0`，与实测的 DSH 0.2.2-rc.1 对齐。

### Fixed
- 修复 `sessionId` 路径穿越：`.` / `..` 不再能作为会话目录名，避免请求把文档写到 `sessions` 目录之外。

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
