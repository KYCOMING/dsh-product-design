# Changelog

本文件记录 dsh-product-design 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Removed
- **移除新会话的「打开产品设计」入口**：新会话（还没有消息）不再在输入框旁显示「打开产品设计」按钮，同时删除 `conversation.hero.options` 的注册、`ui/heroEntry.js` 组件与相关 `hero.open` 文案；空会话可发送消息后从会话顶部的「产品设计」标签进入，或直接用 `/design <需求>` 绘制。

### Added
- **`/design` 斜杠命令的图标与中文标题**：斜杠菜单里的 `/design` 行现在显示中文本地化标题「设计」（保留 `design` 作为别名，显示为「设计 design」）与插件设计图标。由于宿主命令描述符不携带标题/图标、客户端只为内置命令与 `commandUi` 贡献项提供这些展示字段，且 `/design` 需保留 `<需求>` 自由参数（不能用同名客户端贡献项），改由客户端 `ui/commandFace.js` 给命令菜单候选行补充 presentation（标题/描述/图标，随界面语言切换），仅影响外观、不改变命令行为。
- **机器可读的 `install` 字段**：`package.json` 顶层新增 `install`，值为规范安装命令 `dsh plugin --profile web add github:KYCOMING/dsh-product-design`，供插件市场 L3「安装规范」检查直接从 manifest 解析安装路径（`engines.dsh` 已声明 DSH 版本要求）。

### Fixed
- **磁吸按钮悬停时图标消失**：磁吸开启时按钮为「白色图标 + 品牌底」，但 `.dpd-iconbtn:hover` 的浅灰底覆盖了激活态品牌底，导致白色图标贴在浅灰上不可见；现在激活态 hover 保持品牌底色与白图标。

### Changed
- **移除编辑器「页面状态」切换按钮**：删除工具栏顶部「正常 / 加载中 / 空状态 / 错误」切换段与右侧属性栏「页面状态」创建区及其处理逻辑（此前点击这些按钮会创建不出现在页面列表里的变体页）；预览里对已存在状态的只读切换、以及 AI 的 `add_page_state` / `delete_page_state` 保留。
- **对话卡片「打开画布」改为进入会话内视图**：点击产品预览卡片上的「打开画布」现在会切换到会话顶部的「产品设计」选项卡（与手动点击选项卡完全一致，保留应用侧栏与视图标签），不再进入不同的全屏主面板布局；当会话没有选项卡行（空会话/标签被收起）时回退为全屏。
- **系统提示补充「参考优秀设计」方法论**：内置提示词新增要求——先按用户的不同需求判断目标平台（Web / 移动端 App / 小程序），再参考对应平台的优秀设计与规范（SaaS / 官网信息架构与响应式布局、iOS Human Interface Guidelines、Material Design、微信小程序设计指南）；并优先借鉴即时设计（js.design）资源广场等开源设计社区，以及 Dribbble、Behance、Mobbin 等设计资源库的开源设计稿，避免凭空臆造界面；画板尺寸随平台对齐（Web 桌面尺寸、移动端 390×844、小程序贴近手机尺寸）。
- **默认画布改为空白（0 页）**：新会话/新建的设计稿默认**没有任何页面**，打开产品设计是一张空画布，由用户或 agent 通过页面列表的「+」手动新建第一页；不再自动预置空白画板（移除随之不再使用的 `sample.welcome` / `sample.welcomeSub` 文案）。
- **产品设计标签恢复默认显示**：每个新会话默认就有「产品设计」标签（此前曾改为仅在 `/design` 后出现，现恢复为默认可见）；还没有消息的空会话仍可用输入框旁的「打开产品设计」入口进入。
- **允许删除最后一个页面**：取消「只剩一个页面时不可删除」的限制，现在可以把页面直接删到 0 页（回到空白画布），客户端删页与 AI 的 `delete_page` 操作均生效。

## [1.5.0] - 2026-11-05

### Changed
- **设计稿按会话归属（1 对 N）**：设计稿不再是一个全局共享库，而是归属于创建它的会话；`GET /docs` 只返回当前会话 `owner` 的稿子，左侧列表因此只显示当前会话的设计稿。存储上 `docs/<docId>.json` 增加 `owner` 字段（旧的无 `owner` 稿子会在其所属会话首次列出时自动认领）。切换会话只会看到并编辑自己的稿子。
- **当前设计稿不可删除**：正在被当前会话选中的设计稿受保护，点击删除时不再静默替换成空白稿，而是提示「当前设计稿已被选中，无法删除」；其他设计稿仍可正常删除并从列表移除。
- **自动生成的设计稿命名**：会话首次打开、或 Host 把会话自动补发到一份新的空白稿时，会以当前会话标题命名（取不到标题时仍为「未命名设计稿」）；手动新建 / 复制的稿子保持原有命名逻辑。
- **构建产物不再入库**：`dist/` 加入 `.gitignore` 并从版本库移除，改由构建 / 安装时生成（新增 `prepare` 脚本，`prepack` / `pretest` 也会构建）。

### Removed
- **移除「导入」设计稿功能**：删除设计稿面板的「导入」按钮及其全部相关代码（客户端 `importFile`、`pickJsonFile`、`/docs/import` 接口、Host `importDoc`、相关 i18n 文案与测试）。设计稿库仅保留新建 / 重命名 / 复制 / 删除 / 导出。

### Fixed
- **提示消息不显示**：面板已有 `toast` 状态但从未渲染，导出等状态提示不可见；现在会渲染状态提示条。
- **会话被重绑到空稿时画布卡在旧稿**：当 Host 把会话重绑到一份新的空白稿（0 页）时（例如其他会话删除了共享稿），客户端会像首次打开一样初始化它并刷新设计稿列表，不再停留在旧稿。

## [1.4.0] - 2026-11-05

### Added
- **设计稿库**：设计稿从「会话附件」变成独立对象（`docs/<docId>.json`），会话只绑定当前稿（`sessions/<sessionId>/active.json`）。左侧新增「设计稿」面板：新建、重命名（双击）、复制、删除、导出 JSON、导入 JSON；删除正在使用的稿子会自动给会话分配一份新的空白稿。
- **图片组件**：支持 URL 或本地文件（2MB 内转 data URL）、`cover / contain / fill` 三种填充方式；编辑器、HTML、React、PNG 导出都渲染真实图片。
- **页面状态变体**：加载 / 空 / 错误不再是文案蒙层，而是真实变体页（`variantOf` + `stateKey`）。顶部状态切换直接切换/创建变体，变体可以像普通页面一样增删元素；复制基础页会带上变体，删除基础页会一起删除变体，改画板尺寸会同步整个状态家族；预览里可切换状态；HTML / React 导出带上状态切换条；AI 用 `add_page_state` / `delete_page_state`。
- **空会话入口**：注册 `conversation.hero.options`，空白会话在输入框旁显示「打开产品设计」，直接进入全屏画布。
- **保存状态与冲突处理**：工具栏实时显示「已保存 / 保存中… / 仅本地 / 同步失败 / 有冲突」；409 不再静默采纳远端，而是保留本地文档并弹出冲突条，可「保留我的改动」或「使用远端版本」。

### Changed
- **HTTP API**：新增 `GET/POST /docs`、`POST /docs/rename|duplicate|delete|import`、`GET /docs/export`、`POST /session/doc`；`GET /doc` 返回 `docId`，`POST /doc` 携带 `docId`，写错稿返回 409。
- **工具**：`product_design_apply` 用 `add_page_state` / `delete_page_state` 取代 `set_page_states`；`product_design_get_document` 返回 `docId`。
- **模型提示**：更新入口说明（会话顶部标签 + 空会话入口）、设计稿库、图片 `src/fit` 与状态变体。
- **预览交互不写回**：预览里的开关 / 复选框 / 下拉切换改为瞬态，不再修改设计稿或产生撤销步骤。
- **存储结构变更（不兼容）**：设计稿从 `sessions/<sessionId>/doc.json` 移到 `docs/<docId>.json` + `sessions/<sessionId>/active.json`；旧版按会话存的稿子不再读取（开发阶段，不做迁移）。
- **构建产物目录**：`client.js` / `index.js` 从仓库根目录移到 `dist/`，源码仍全部在 `src/`；`exports`、`files`、CI 与测试路径同步更新。
- **README**：同步设计稿库、图片、状态变体、空会话入口与新的存储 / API 结构。

## [1.3.0] - 2026-11-05

首个「会话标签页」版本。文档格式升到 v3，旧稿不再读取；同时补齐编辑手感、原型交互、约束 / Auto Layout 与三种导出。

### Added
- **产品设计改为会话视图标签**：注册 `conversation.view`（id `dsh-product-design`，order 20），与 Chat / Trajectory 并列在会话顶部；移除 `sidebar.panellist` 入口，不再出现「选中会话→点侧边栏→跳走」的割裂感。视图内提供「全屏」进入独立画布，全屏提供「返回会话」。
- **导出 PNG**：当前页按 1× / 2× 光栅化，使用模型渲染 → SVG `foreignObject` → canvas，无第三方依赖。
- **导出单文件 HTML 原型**：内嵌全部页面与一段运行时，支持页面跳转、返回、弹层，以及开关 / 复选框 / 标签页 / 下拉的交互；双击即可在浏览器打开。
- **导出 React + Tailwind**：生成单个 `Prototype.jsx`，每页一个组件，自由布局用绝对定位、Auto Layout 用 flex，按钮/输入框使用语义标签，并带一个 `useState` 页面路由；产物通过 esbuild JSX 解析校验。
- **约束（Constraints）**：元素新增 `constraints: { h, v }`，支持左/右固定、左右拉伸、居中、按比例；画板与容器尺寸变化时递归求解。默认 `left/top`，导航栏/标签页/卡片/图片/输入框/容器默认左右拉伸。`set_page_frame` 支持 `resizeMode: constraints|scale|none`（默认 constraints）。
- **Auto Layout**：容器/编组新增 `layout: { mode:'stack', direction, gap, padding, align, justify }`，子元素坐标由布局接管；拖动子元素改为调整顺序。新增 `src/shared/layout.js`，Host reducer 与客户端共用同一套求解与重排逻辑。
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

### Fixed
- 修复导出 PNG 无反应：
  - `font-family` 里的双引号破坏了 SVG `style` 属性，生成的 SVG 不是合法 XML；改为单引号 + 属性转义。
  - Chromium 会把 `blob:` URL 的 SVG（含 `foreignObject`）标记为跨源，导致 canvas 被污染、`toBlob()` 抛 SecurityError；改用 `data:` URL。
  - 图片加载增加 10s 超时，`document.fonts.ready` 最多等待 500ms，避免无限挂起。
  - 导出成功/失败显示 toast；新增 SVG XML 合法性与 data URL 管线回归测试。

### Changed
- **清理死代码**：删除 `childrenOf`、`stackParentOf`、`PAGE_STATES`、`RESIZE_MODES`、`sameBox` 等未被引用的声明；把 26 个仅内部使用的导出收口为非导出；清理 30+ 处未使用的 `catch` 绑定、未使用导入/变量与未使用的默认导出。审计结果：无未被引用的文件、i18n key、CSS 选择器或图标。
- **构建产物标记**：`index.js` / `client.js` 文件头加 `AUTO-GENERATED` 横幅，新增 `.gitattributes` 标记为 generated，避免被误认为手写源码。
- **工程结构重构（无行为变化）**：客户端按 `domain/`（纯文档变换，无 React/DOM）→ `editor/`（状态与行为 hooks，一个关注点一个文件）→ `ui/`（纯展示）→ `panel.js`（组合根，1964 → 448 行）分层；Host 拆为 `paths / store / http / tools / preview / prompt / command / model` 八个模块，`index.js` 只做装配。新增的编辑命令按「domain 纯变换 → editor 命令 → ui 调用」添加。
- **文档格式升到 v3（破坏性，不做兼容）**：元素新增 `name / hidden / locked / opacity / interactions`，页面新增 `states`；localStorage 键改为 `dsh-product-design:doc:v3`。移除 v1→v2 迁移、半宽文档自愈 `repairDoc`、旧全局 `doc.json` 迁移等全部兼容代码。
- **「缩放内容以适配画板」**：右侧「画布设置」新增按钮，把内容按包围盒缩放并平移回铺满画板，用于修复已经卡在角落的设计稿。
- **切画板尺寸默认按约束重排**：`set_page_frame` 与画板预设默认使用 `resizeMode: 'constraints'`；右侧「画布设置」可在「按约束 / 整体缩放 / 保持不变」之间切换，记忆到 UI 偏好。
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
