# dsh-product-design 工程架构耦合审查报告

> 版本：v1.5.0 ｜ 审查对象：`src/` 全部 52 个源文件、11,632 行 ｜ 方法：静态解析全部 `import` 生成依赖图 + 逐文件通读关键模块。
> 结论速览：**分层骨架是健康的（无循环依赖），真正的耦合不在"层"上，而在"同一职责被复制"**——文档归一化、文档变更、元素渲染这三件事都各有 2–4 份实现；外加 `panel` / `inspector` 等几个"巨型文件"职责过载。

---

## 1. 结论（TL;DR）

> 🔴 **已复现的线上缺陷（最高优先，先修）**：`⌘D` / 复制元素**必抛 `ReferenceError: cloneElementDeep is not defined`**——`domain/tree.js:114` 使用了未导入的 `cloneElementDeep` 与 `uid`（它们只在 `shared/elements.js` / `client/model.js` 定义）；容器缩放子级约束路径同理（`useGestures.js:378` 未导入 `shared/layout.js` 的 `resizeElement`）。这是"同一职责多份实现 + 合并遗漏"的直接后果，已用 `node` 执行验证（见 §3 P0-0）。

| 优先级 | 问题 | 本质 | 主要文件 |
|---|---|---|---|
| **P0** | 🔴 复制元素 / 容器缩放抛 `ReferenceError`（**已复现**） | 重复合并遗漏 | `domain/tree.js`、`editor/useGestures.js` |
| **P0** | 文档归一化 / 默认值在 client 与 host **双份实现** | 复制 + 漂移风险 | `client/model.js` ↔ `host/model.js` |
| **P0** | 文档变更引擎 **双份**：host `applyOps` vs client `domain/document.js` | 双语义源，长期必然分叉 | `host/model.js` ↔ `client/domain/document.js` |
| **P0** | 元素渲染逻辑 **3–4 份**（编辑器 / HTML 导出 / React 导出 / 卡片缩略图） | 复制 | `widgets.js`、`export/render.js`、`export/react.js`、`cards.js` |
| **P1** | `panel.js` 名义"组合根"实为编排上帝组件（fan-out=24） | 职责过载 | `client/panel.js`（577 行） |
| **P1** | 巨型单体组件 | 职责过载 | `ui/inspector.js` 877、`ui/left.js` 570、`ui/canvas.js` 510、`widgets.js` 562 |
| **P1** | host 侧巨型 reducer 与多职责 store | 职责过载 | `host/model.js`（`applyOne` ~330 行）、`host/store.js`（428 行） |
| **P1** | editor hooks 职责过载（`useDocument` 返回 17 字段、`useGestures` 多手势、`useDocs` 混 API） | 职责过载 + prop-drilling | `editor/useDocument.js` 538、`editor/useGestures.js` 479、`client/docs.js` |
| **P2** | `domain → model` 越层；`model.js` 混 4 种职责 | 分层泄漏 | `client/domain/document.js`、`client/model.js` |
| **P2** | 操作（op）词汇在三处重复维护：工具描述 / 模型提示 / 宿主 reducer | 复制，易漏改 | `host/tools.js`、`host/prompt.js`、`host/model.js` |
| **P2** | ID 生成 4–5 处各自实现 | 复制 | `host/model.js`、`host/store.js`、`shared/page-states.js`、`client/model.js`、`host/command.js` |
| **P2** | `i18n.js` / `styles.js` 巨型常量 | 次要 | `client/i18n.js` 535、`client/styles.js` 205 |

> ⚠️ **附带发现（正确性 / 安全，源于 `store.js` 的职责纠缠）**：`deleteDoc` / `exportDoc` / `renameDoc`（`host/store.js:382–414`）只按 `docId` 操作，**没有归属（owner/session）校验**，而 `listDocs` 却按 owner 过滤；即同源请求可删除/导出/改名其他会话的稿子。另外 `writeJson`（`store.js:54–63`）吞掉所有异常（"best-effort"），落盘失败会静默丢失。这两点建议在拆 `store.js` 时一并修复。

**建议的动手顺序**：先统一 `shared/schema.js`（纯函数、低风险、立刻消除 P0-1）→ 抽元素视觉规范消除 P0-3 → 拆 UI 巨型组件（纯展示、低风险）→ 最后拆 `panel`/`useDocument`（高风险，需交互回归测试）。P0-2 的双引擎统一可作为贯穿性重构，与 P0-1 共用 schema。

**三张"重复"全景图（本次审查的核心）：**

```text
① 写入路径 —— 双引擎（client 从不 POST /apply）
   Agent 工具 ──► tools.js ──► store.apply ──► applyOps（host reducer） ─┐
                                                                          ├─► 文档 JSON
   浏览器面板 ─► domain/document.js ─► setDoc ─► POST /doc ─► store.setDoc ┘

② 归一化 —— 双份
   defaultDoc/normalizeElement/normalizeDoc/normalizeInteractions (client)
   ≈ emptyDoc/ensureElement/ensurePage/ensureDoc/normalizeInteractions (host)

③ 元素渲染 —— 四份
   编辑器: widgets.renderWidget │ HTML导出: export/render.renderElement
   React导出: export/react.renderElement │ 卡片缩略: cards.renderMiniElements
```

---

## 2. 现状与量化

### 2.1 分层意图（README 声明）

```
src/
├─ shared/     纯逻辑，client 与 host 共用（elements / layout / snapping / page-states）
├─ client/
│  ├─ domain/  纯函数：文档变换，无 React / 无 DOM
│  ├─ editor/  React hooks：持有状态与副作用，调用 domain
│  ├─ ui/      纯渲染：只接收 props，不读文档 / 不发请求
│  ├─ export/  独立"干净"渲染器（PNG / HTML / React）
│  └─ panel.js 组合根：只装配 hooks 与 ui
└─ host/       Node 半：model(纯 reducer) / store / http / tools / preview / command / prompt
```

### 2.2 依赖热点（静态解析结果）

**扇出最高（最"重"的模块）：**

| fan-out | 文件 |
|---:|---|
| 24 | `src/client/panel.js` |
| 7 | `src/client/index.js` |
| 5 | `src/client/cards.js`、`ui/inspector.js`、`ui/left.js`、`export/index.js`、`domain/document.js`、`editor/useDocument.js`、`editor/useEditorActions.js` |

**被依赖最多（核心基础模块）：**

| fan-in | 文件 | 评价 |
|---:|---|---|
| 23 | `client/react.js` | 迷你 React 包装，正常 |
| 15 | `shared/elements.js` | 核心工具，但 326 行里混了遍历/包围盒/命中检测/克隆/树操作，见 P2 |
| 13 | `client/constants.js` | 常量表，正常 |
| 7 / 6 | `shared/page-states.js`、`shared/layout.js` | 正常 |
| 5 | `client/model.js`、`domain/document.js` | 正常 |

**循环依赖：`无`**（脚本对全部 52 文件 DFS 检测，0 个环）。这是本次审查的好消息：拆分不会牵出环形耦合。

**唯一的分层越界**：`src/client/domain/document.js:20 → import { uid } from '../model.js'`（domain 依赖了持久化/API 层，见 P2-8）。

### 2.3 超大文件（>400 行，共 11 个）

| 行数 | 文件 | 是否需拆 |
|---:|---|---|
| 877 | `client/ui/inspector.js` | ✅ P1 |
| 627 | `host/model.js` | ✅ P1（`applyOne` 单函数 ~330 行） |
| 577 | `client/panel.js` | ✅ P1 |
| 570 | `client/ui/left.js` | ✅ P1 |
| 562 | `client/widgets.js` | ✅ P0-3 / P1 |
| 538 | `client/editor/useDocument.js` | ✅ P1（状态+历史+SSE+POST+切稿 5 职责） |
| 535 | `client/i18n.js` | ⚠️ P2（纯词典，可接受） |
| 510 | `client/ui/canvas.js` | ✅ P1 |
| 479 | `client/editor/useGestures.js` | ✅ P1（多种手势 + 磁吸 + 重挂载） |
| 472 | `client/export/react.js` | ✅ P0-3 |
| 428 | `host/store.js` | ✅ P1（单据存储 + 会话绑定 + 稿库 + 订阅） |

---

## 3. 逐项问题详述

### P0-0 🔴 [已复现] 重复合并遗漏导致 ReferenceError

**现象**：复制元素必崩；拖拽缩放"带子元素的容器"会崩。

**证据（静态 + 执行）：**
- `domain/tree.js:114` 的 `duplicateInTree` 调用 `cloneElementDeep(el, () => uid())`，但 `tree.js:9` 只 `import { isContainerType }`。`cloneElementDeep` 定义在 `shared/elements.js:153`、`uid` 在 `client/model.js:15`（`domain/document.js` 虽导入了这两者，但 **ESM 模块不共享作用域**，`tree.js` 看不到）。
- **执行验证**：`node --input-type=module` 直接调用 `duplicateElements(...)` → 抛 `ReferenceError: cloneElementDeep is not defined`。
- 调用链：`⌘D` 快捷键 / 右键"复制" / Inspector 复制按钮 → `useEditorActions.duplicateSelection`（`useEditorActions.js:112`）→ `domain/document.js:85 duplicateElements` → `tree.js:114`。
- 同类问题：`useGestures.js:378` 调用 `resizeElement(...)`，但只从 `shared/elements`、`shared/snapping`、`domain/tree` 导入，**未**导入 `shared/layout.js:88` 的 `resizeElement` → 缩放含子元素的容器时 `ReferenceError`。
- 为何测试没抓到：`domain.test.js` **没有 duplicate 用例**；容器缩放交互没有单测。

**根因**：`cloneElementDeep` / `uid` / `resizeElement` 这些原语在 `shared` / `model` / `domain` 被复制或半引用，`tree.js` 与 `useGestures.js` 各自"以为"能用——这就是"重复实现"已经在造成真实缺陷的实证。

**修复（立即，约 3 行）：**
- `domain/tree.js` 增加 `import { cloneElementDeep } from '../../shared/elements.js'` 与 `import { uid } from '../model.js'`（或先把 `uid` 移到 `shared/id.js` 再统一导入）；
- `useGestures.js` 增加 `import { resizeElement } from '../../shared/layout.js'`；
- 补回归测试：`duplicateElements`（含嵌套容器）、容器缩放子级约束。

### P0-1 文档归一化 / 默认值：client 与 host 各写一遍

**现象**：同一套"把任意输入整理成合法文档"的规则，在浏览器半和宿主半各有一份实现，函数几乎一一对应。

**证据（逐对对照）：**

| 职责 | client (`src/client/model.js`) | host (`src/host/model.js`) |
|---|---|---|
| 交互归一化 | `normalizeInteractions` **49–60** | `normalizeInteractions` **101–113** |
| 元素归一化 | `normalizeElement` **62–90** | `ensureElement` **125–151** |
| 页面归一化 | `normalizeDoc` 内联页面处理 **96–129** | `ensurePage` **153–180** |
| 文档归一化 | `normalizeDoc` **96–129** | `ensureDoc` **182–191** |
| 空文档 | `defaultDoc` **42–47** | `emptyDoc` **115–117** |
| 默认组件状态 | `defaultState(type)`（constants） | `defaultStateFor` **119–123** |
| 元素类型表/尺寸 | `TYPE_INFO`（constants.js） | `ELEMENT_TYPES` **41–57** |
| 画板预设 | 散落 `frame` 默认值 | `PRESETS` **75–80** |

此外 `client/model.js:18 makeEl` 还是一个独立的元素默认值构造器——于是"元素默认值"共有 client `makeEl`、client `normalizeElement`、host `ensureElement` 三处会生成，改默认尺寸/状态要改三处。

**已经存在的契约漂移（已逐条核实，不是理论风险）：**

| 字段 | client 行为 | host 行为 | 后果 |
|---|---|---|---|
| `state` 合法性 | `raw.state || defaultState(type)`（`client/model.js:78`）——任意字符串都接受 | `states.includes(e.state) ? e.state : defaultStateFor(type)`（`host/model.js:141`）——非法则重置 | 面板写入的非法状态，经 agent 往返后被静默改写 |
| `frame.preset` | 接受任意 `fr.preset`（`normalizeDoc` 内） | 仅接受 `PRESETS` 内的（`ensurePage:156`） | 预设被悄悄替换 |
| 垃圾元素 | 返回 `null` 并过滤掉 | 强制转成 `text` 元素 | 元素数量可能不一致 |
| 空文档 | `!pages.length` 时返回 `null`（视为"需要播种"） | `ensureDoc` 接受空文档 | 双方对"空稿"的隐式契约不同 |
| 编组名称 | `groupEntries` 存 `props:{name}`、`el.name=''`（`domain/document.js:181`） | `group_elements` 存 `el.name`（`host/model.js:527`） | agent 建的组名在图层里显示不出来，用户建的组名 agent 读不到 |

**影响**：这是最危险的耦合。新增一个元素属性（例如再加一个 `rotation`、新状态、新约束枚举）时，只改一侧 → 另一侧静默丢弃该字段，而且是**跨进程边界**的静默漂移：客户端编辑看起来正常，Agent 工具经 host `applyOps` 写回时字段消失（或反之）。每半各自的测试都会通过，问题只在真实联动时暴露。`TYPE_INFO` 与 `ELEMENT_TYPES` 两套尺寸表已经有隐性不一致的可能。

**拆分/修复建议**：新增 `src/shared/schema.js`（纯函数、零副作用），承载：
- 元素/页面/文档三个 `normalizeX()`；
- 类型表 `ELEMENT_TYPES`、预设 `PRESETS`、默认状态 `defaultStateFor`、交互动作白名单；
- 从 `client/constants.js` 抽出 `TYPE_INFO` 与 `ELEMENT_TYPES` 合并为唯一来源。
`client/model.js` 与 `host/model.js` 都改为调用它，删除各自副本。**用一组"归一化对拍测试"锁定**：同一份脏输入喂给两个入口，输出必须逐字节相等。

---

### P0-2 文档变更引擎双份：host `applyOps` vs client `domain/document.js`

**现象**：修改文档语义有两套并行实现——客户端交互编辑走 `domain/document.js` 的一组命令函数；Agent 工具走 host `host/model.js#applyOps` 的声明式 op reducer。两者覆盖的操作高度重叠但命名/粒度/语义各写一遍。

**证据：**
- host `applyOne`：**243–570 行**（单函数 ~330 行），处理 **18 种** op：
  `set_document_name, add_page, duplicate_page, delete_page, rename_page, set_active_page, set_page_frame, add_page_state, delete_page_state, clear_page, add_container, add_element, update_element, delete_element, move_element, reorder_element, group_elements, ungroup_elements`。
- client `domain/document.js`：**21 个导出**命令：`activePageOf, addPage, removePage, renamePage, patchFrame, fitContent, addElement, removeElements, duplicateElements, reorderElements, moveElementTo, patchElements, moveElementsBy, patchElement, setElementText, pasteElements, groupEntries, ungroupEntry, alignEntries, distributeEntries, reflow`。
- 交集：页面增删改/框体、元素增删改、移动、重排、编组/解组——**同一语义两处实现**。
- 差异：client 独有 `align / distribute / reflow / paste / fitContent`（交互专用）；host 独有 `add_page_state / delete_page_state`（变体页）。

**两条写入路径（关键事实）**：
- **Agent 工具**：`tools.js` → `store.apply` → `applyOps`（host reducer）。
- **浏览器面板**：`domain/document.js` 变换 → `setDoc` → `POST /doc` → `store.setDoc` → `ensureDoc`。**客户端从不调用 `/apply`**（仅 `http.js` 与测试引用它）。

也就是说：宿主 reducer 与客户端变换是两套并行引擎，`ensureDoc`（host）与 `normalizeDoc`（client）又是两套并行归一化，而它们**处理的是同一批文档**。

**已存在的语义差**：`applyOps` 会 `reflow`（`host/model.js:602`），但 `ensureDoc` **不** reflow（`182–191`）；而 `store.setDoc`（客户端 POST 路径）依赖客户端自己已经 reflow 过 → 两条路径对 Auto Layout 的最终状态处理不对称。

**影响**：语义漂移的温床。例如"移动元素时的父子容器约束""编组后的坐标换算""页面框体缩放如何处理约束"——任一侧改了规则另一侧不会同步。Agent 通过工具批量搭建的画布，与用户在编辑器里手动操作，可能得到不一致的结构，且难以复现。host `move_element`（`462–497`）甚至用本地的 `removeElementById`（`570–589`）重写了 `shared/elements.js` 已有的 `moveElementInTree`；`group/ungroup` 也是两边各写一遍（`host/model.js:510–565` vs `domain/document.js:164–226`），而 `shared/elements.js` 恰好缺 group/ungroup/move-with-index 这些原语。

**拆分/修复建议**：
1. 先把"op 语义"下沉为 `shared/ops.js`：把 host `applyOne` 的 18 个分支拆成**按类分组的纯 handler**（`pageOps.js / elementOps.js / layoutOps.js / stateOps.js`），供 host reducer 与 client domain 共用底层原语；
2. client `domain/document.js` 的交互命令改为**调用共享原语**而不是各自重写树变换；
3. 为每个 op 建"双向对拍测试"：同一 op 分别走 client 命令与 host `applyOps`，结果文档需一致。
> 注意：交互编辑需要更细的中间态（选区、历史快照），不建议强行合并成"一个 reducer"；目标是**统一语义原语**，而非统一调用方式。

---

### P0-3 元素渲染逻辑 3–4 份

**现象**：把"一个元素怎么画"这件事，在四处各写了一遍：编辑器画布、HTML 导出、React 导出、对话卡片缩略图。

**证据：**

| 渲染器 | 位置 | 规模 | 形态 |
|---|---|---|---|
| 编辑器组件渲染 | `client/widgets.js` `renderWidget` **5–562** | 558 行 | 单个函数内 **13 段 if-chain**：container/group、button(51)、input(88)、card(124)、navbar(181)、tabs(222)、toggle(262)、checkbox(293)、avatar(356)、text(379)、image(400)、badge(451)、select(476) |
| HTML 导出 | `client/export/render.js` `renderElement` **66–295** | 230 行 | 同样的按 type 分支生成 HTML 字符串 |
| React 导出 | `client/export/react.js` `renderElement` **98–349** | 250 行 | 同样的按 type 分支生成 JSX + Tailwind class |
| 卡片缩略图 | `client/cards.js` `renderMiniElements` **132–164** | 33 行 | 叶子复用 `renderWidget`，但**容器盒模型逻辑重复实现**一遍（background/radius/clipContent，抄自 `canvas.js:94–113`） |

**更细的量化（静态逐分支核对）：**
- **14 种元素 × 3 个渲染器 = 42 段几乎相同的分支**，合计约 **1,340 行** per-type 布局/样式逻辑（`widgets.js` 562 + `render.js` 306 + `react.js` 472）。
- 例：button 的圆角 8 / 字号 14 / 字重 600 / sample 文案、card 的 14px 内边距 / 6px gap / 15px·600 标题 / 12.5px 副标题 / 62% 进度条、toggle 的 `knob = max(12, h-6)`、avatar 的 `max(12, round(h*0.34)) + shade(acc,0.15)`——三处各写一遍；SVG 字符串（dots / image / chevron）也在 `widgets.js` 与 `render.js` 各存一份。
- **4 套元素树遍历**：`widgets.js`、`export/render.js#box`、`export/react.js#boxClasses`、`cards.js#renderMiniElements`。
- **3 套原型路由**（navigate / back / overlay / state 语义相同）：`editor/usePreview.js`、`export/html.js` 的 RUNTIME、`export/react.js` 生成的 `App`。

**已经发生的漂移（不只是重复，是用户可见的 bug）：**
- `textAlign` 可编辑（`inspector.js`）且 `export/render.js` 生效，但 `widgets.js` 与 `export/react.js` **忽略**它；
- React 导出丢状态：input 的 focus/filled/error、select 的 open、card 的 hover；HTML 导出丢 button 的 hover/active；
- `export/react.js` 把激活 tab 写死 `text-[#6366f1]`，**丢掉 `props.color`**（对比 `render.js` 用 `acc`）；
- `export/render.js` 里混入 PNG 专用 `ctx.raster` 分支。

**影响**：组件系统是产品核心资产，也是最易演进的部分。新增一种元素、调整圆角/间距/状态色，必须同步改 3–4 处，否则"编辑器里是这样、导出后变样、卡片预览又不一样"。这是用户可见的一致性 bug 来源。

**拆分/修复建议**：
1. 抽 `src/shared/element-visual.js`：**纯函数**，输入 `(el, state, theme)` → 输出归一化的视觉规格（盒模型、背景、圆角、边框、文字样式、内边距、子布局参数），不含 React/HTML/JSX；
2. `widgets.js` / `export/render.js` / `export/react.js` 变成三个**薄 adapter**，只把规格翻译成自身目标（React 元素 / HTML 字符串 / JSX+class）；
3. `cards.js#renderMiniElements` 改用同一规格，删除重复容器逻辑；
4. `widgets.js` 进一步按类型拆成 `widgets/button.js` 等（每段独立、可单测）。

---

### P1-4 `panel.js`：名义"组合根"实为编排上帝组件

**现象**：注释自称"只做 hook 装配 + 布局状态"，但实际持有大量真实逻辑，且 fan-out=24（全项目最高）。

**证据（`client/panel.js`）：**
- 直接 import 了 `shared/elements.js#findElementEntry`、`domain/document.js#activePageOf`——组合根伸手进 domain/shared；
- `setActivePage`（**140–157**）：同时改动 selection + preview + doc，是一段真正的业务编排；
- `resetTransientRef` / `adoptRef` / `docsRefreshRef`（**46–48, 173–186**）：为绕开 hook 声明顺序而用 ref 手工串联，说明 hooks 之间耦合；
- Ctrl/⌘+滚轮缩放副作用 **187–219**；
- 分栏拖拽 `startResizeLeft/Right` **246–282**（手写 mousemove/up）；
- `openContextMenu` **283–312**（拼面包屑菜单）；
- 状态变体 tab 渲染 **523+**；`toggleSnap`、toast 计时、右键外点关闭等。
- `useGestures`/`useKeyboardShortcuts` 的入参是**十几个字段的超长 props**（**158–172, 204–220**），典型 prop-drilling。
- 向视图传参：`LeftView` **30** 个、`CanvasView` **38** 个、`InspectorView` **26** 个、`ToolbarView` **22** 个 props（合计 **116 个扁平 key**，无 view-model）；且 `setEl` 传给 `InspectorView` 却从未被解构（死参）。

**影响**：任何新交互都往 `panel.js` 加代码，它已成为"第二个大杂烩"；hook 顺序敏感（靠 ref 补丁）导致重构易碎。

**拆分/修复建议**：
- 抽出 `editor/useLayoutResize.js`（分栏拖拽）、`editor/useCanvasZoom.js`（滚轮缩放）、`editor/useContextMenu.js`（右键菜单状态与面包屑）、`editor/useActivePage.js`（`setActivePage` 编排）；
- 用一个**上下文对象（Context/单一 editor API 对象）**替代十几个分散 props，解开 hook 之间的 prop-drilling 与顺序耦合；
- `panel.js` 目标降到 ~150 行，只保留布局骨架。

---

### P1-5 巨型单体组件（inspector / left / canvas / widgets）

| 文件 | 现状 | 拆分建议 |
|---|---|---|
| `ui/inspector.js`（877，仅一个 `InspectorView`） | **13 个属性编辑分区 + 4 种模式**挤在一个函数：折叠外壳、多选、单选中身份+几何、文本/图片（含文件选择）、颜色/字体、容器背景/裁剪、约束、Auto Layout（方向/gap/padding/align/justify）、圆角/透明度、状态、交互、元素操作，末尾还塞了**完全不同的对象——页面/画板编辑器（769–851）**；并**内联了 domain 变更逻辑**（构造 interaction 对象、默认 layout、约束展开、opacity clamp） | 按属性域拆 `inspector/{fields.js, SelectionProps.js, MultiSelection.js, PageFrame.js, InteractionsEditor.js, LayoutEditor.js}` + `InspectorView.js`（外壳+分发） |
| `ui/left.js`（570，一个 `LeftView`） | 混了三个面板：**页面+组件库**（~100–）、**设计稿库/文档列表**（192–328）、**图层树**（376–462，含拖拽重排） | 拆 `left/pagesPanel.js`、`left/docsPanel.js`、`left/layersPanel.js`，`LeftView` 组合 |
| `ui/canvas.js`（510） | `CanvasView`（30–473：画板 + `renderElements` 74–222 + 页标签 222+）与 `OverlayLayer`（474–510）同文件 | 拆 `canvas/frame.js`、`canvas/elementLayer.js`、`canvas/labels.js`、`canvas/overlay.js` |
| `widgets.js`（562） | 见 P0-3 | 见 P0-3，按元素类型拆文件 |

**影响**：单文件难读、难测、难并行修改；任何小改都可能触碰整个文件（合并冲突高发）。

---

### P1-6 host 侧：巨型 reducer + 多职责 store

**`host/model.js`**
- `applyOne`（**243–570**）单函数 ~330 行、18 个 op 分支挤在一起，是 P0-2 的宿主端来源。
- 建议：按类拆 `host/model/ops/page.js`、`element.js`、`layout.js`、`state.js`，`applyOne` 变成分发器；归一化部分（P0-1）抽出后本文件可降到 ~120 行。

**`host/store.js`（428）**
- `createDocStore`（80–158）：单稿存储 + revision + owner + 订阅 + 持久化；
- `createStores`（159–427）：稿库 Map + 会话绑定 Map + `listDocs/duplicate/rename/delete/export` + 订阅转发。
- 建议拆 `host/doc-store.js`（单稿：revision/持久化/订阅）、`host/session-bindings.js`（会话⇄稿件绑定）、`host/doc-library.js`（列表/复制/重命名/删除/导出），`store.js` 仅作组合。
- 附带重复：`store.js` 的 `clone`（35–44）与 `model.js clone`（193–202）重复；`metaOf`（65–78）、`listDocs` 计数（341–357）与 `model.summarizeDoc`（607–627）都在算同一组页面/元素计数。

---

### P1-7 editor 层 hooks 职责过载（useDocument / useGestures / useDocs）

**`useDocument.js`（538 行）返回 17 个字段**（`doc/docId/docRef/setDoc/mapEl/setEl/setElProps/undo/redo/canUndo/canRedo/pushPastSnapshot/adoptRemoteDoc/switchDoc/refreshFromHost/syncState/resolveConflict`），一个 hook 同时承担 6 件事：
- 文档状态（`useState` + `docRef`）；
- 撤销/重做历史（`histRef` + 合并窗口 `lastKeyRef`）；
- Host SSE 订阅与断线重连（**410–489**）；
- 本地编辑 400ms debounce 回写（**353–409**）；
- 切稿（`switchDoc`/`refreshFromHost`）与自动播种；
- 409 冲突记录与解决（`conflictRef`）。
建议拆：`useDocState`（doc/setDoc/mapEl/setEl + 历史）、`useHostSync`（SSE + debounce POST + conflict）、`useDocSwitching`（switch/refresh/seed），`useDocument` 仅作组合。

**`useGestures.js`（479 行）** 一个 hook 混了：空格平移模式（**42–80**）、拖拽（**98–219**，含磁吸与重挂载判定）、栈内重排拖拽（**221–277**）、`reparentElement`（**279–309**）、缩放手柄（**311+**）以及磁吸目标计算。建议：几何/磁吸下沉 `shared/`（已有 `snapping.js` 可扩展），手势拆 `usePan / useDrag / useResize / useStackDrag` 按事件类型分发。此外它接收 **13 个入参**（含 `docRef/zoomRef/snapRef/spaceRef/canvasRef` 5 个外部可变 ref），并用 `setDoc(..., false)`（`:173/:267/:307/:381`）**绕过历史**再手动 `pushPastSnapshot` 提交，等于伸手进 `useDocument` 内部；`startDrag` 还回调 panel 的 `setActivePage`，形成「gesture → panel → doc → gesture」的运行时环（虽无 ESM 环，但有逻辑环）。

**`docs.js#useDocs`（177 行）** 把稿库 API 调用 + 本地状态 + 错误 + 切换编排揉在一起。建议拆出纯 API 客户端 `docs-api.js`，hook 只保留状态机。

> **耦合点**：这些 hook 的输入全靠 `panel.js` 传入**超长 props**（`useGestures` ~12 个字段、`useKeyboardShortcuts` ~16 个，见 `panel.js:158–220`），是 prop-drilling 的核心来源，建议改用单一 editor Context 解耦。

### P1-8 `ui/` 并非纯展示：DOM / I-O / 宿主猴补泄漏

README 声称 `ui/` "只接收 props、不读文档、不发请求"，但实际存在副作用泄漏：
- `ui/inspector.js:10–27 chooseImageFile`：`document.createElement('input')` + `FileReader` + `input.click()`；`:318` 还有 `window.alert`；
- `ui/left.js`：`useEffect(() => onRefreshDocs())` 触发请求（96–98）、`window.confirm`（294）、拖拽用 `getBoundingClientRect()` 算几何（449–472）、组件内 6 个 `useState`；
- `ui/canvas.js:477–479 window.innerWidth/innerHeight`；并接收 `useGestures` 拥有的命令式 `canvasRef`/`spaceRef`（382–441）；
- **`ui/commandFace.js` 根本不是渲染**：`:44–92` 在 **monkey-patch 宿主 `commandUi.candidates` 服务**（改斜杠菜单行）。
建议：文件选择移到 `editor/pickImage.js`（回传 data URL）、确认/alert 移到 `editor/confirmations.js`、视口尺寸改为 prop 或 `viewport.js`、`commandFace.js` 移到 `client/hostIntegration/`，恢复 `ui/*` props-only 契约。

### P2-8 分层泄漏：`domain → model` 与 `model.js` 多职责

- `src/client/domain/document.js:20` `import { uid } from '../model.js'`：domain 本应纯函数、不依赖持久化层。而 `model.js` 含 `localStorage` 读写（`loadDoc/saveDoc/loadUi/saveUi`）、HTTP 客户端（`apiFetch`）、元素工厂（`makeEl/defaultDoc`）、归一化（`normalizeDoc`…）。**为一个 `uid` 把整层依赖拉进来**。
- 建议：`uid` 移到 `shared/id.js`（`crypto.randomUUID` 回退）；`client/model.js` 拆 `model/factory.js`（`makeEl/defaultDoc`）、`model/normalize.js`（→ 并入 `shared/schema.js`）、`model/storage.js`（localStorage）、`model/api.js`（`apiFetch`）。domain 从此只依赖 shared。
- **domain 层并未真正复用 shared（重复清单）**：`domain/tree.js:46–70 extractFromTree` 与 `shared/elements.js:193–217` 逐字节相同；`tree.js:25–44 removeFromTree` 重复 `host/model.js:570–589 removeElementById`；`domain/document.js:277–279 reflow` 重复 `shared/layout.js:173–176 reflowDoc`；"修改单个元素"在 `domain/document.js patchElement/setElementText`、`useDocument.js:102–116 mapEl`、`host/model.js update_element` 各有一份。这就是 P0-0 缺陷的温床。
- **死暴露面（可顺手清理）**：`useDocument` 返回的 `setElProps / adoptRemoteDoc / refreshFromHost` 与入参 `t`、`useExport` 的 `onStatus`、`domain/document.js` 的 `patchElement / reflow` 在 `src/` 内均无人消费。

### P2-9 巨型常量文件（次要）

- `client/i18n.js`（535）：单文件双语词典 + 全局 `APP_CTX`。可接受，但建议按域拆 `locale/zh.json`/`en.json` 或分模块，避免词典无限增长。
- `client/styles.js`（205）：`CSS` 大字符串数组，纯注入，风险低。
- `shared/elements.js`（326）：遍历/包围盒/命中/克隆/树操作耦合在一个文件，可拆 `shared/tree/`（traverse / bounds / hit-test / clone / mutate），fan-in=15，拆时要保持 re-export 兼容。

### P2-10 操作（op）词汇三处重复维护

同一份"支持哪些 op、每个 op 的字段"被写下三遍：
- 工具 schema 的英文长描述：`host/tools.js:61–82`；
- 模型提示 GUIDANCE：`host/prompt.js:8–25`；
- 宿主 reducer 的实现：`host/model.js` `applyOne`（243–570）。
新增/改一个 op 必须同步改三处，漏改就会出现"工具宣称支持但 reducer 不认"或"提示教错用法"。建议抽 `shared/ops-manifest.js`（op 名 + 字段 schema），`tools.js` / `prompt.js` 从中**生成**描述，reducer 从中取 kind 列表。

### P2-11 ID 生成 4–5 处各自实现

`host/model.js:84 newId`、`host/store.js:27 newDocId`、`shared/page-states.js:20 defaultId`、`client/model.js:15 uid`、`host/command.js`（内联 uuid）——各自实现随机/前缀逻辑。建议统一到 `shared/id.js`（`crypto.randomUUID` 回退 + 前缀封装）。

### P2-12 `cards.js` 四职责混合

`cards.js`（353）一个文件里混了 4 件事：平台卡片注册（`turnCardsDefinition`/`registerProductDesignCards`，`:309–353`，被 `client/index.js` 调用）、宿主 DOM tab 点击 hack（`:34–57`）、meta 解析与 turn 事件折叠（`:59–130`）、UI 与 mini 渲染（`:132–302`）。建议拆 `cards/registry.js`、`cards/meta.js`、`cards/openCanvas.js`、`cards/ProductDesignCard.js`；`renderMiniElements` 收进共享 `PageThumbnail`，与 canvas/export 共用同一 `walkTree()`。

---

## 4. 目标结构（建议）

```
src/
├─ shared/
│  ├─ schema.js            # ★P0-1 唯一元素/页面/文档归一化 + 类型表 + 默认状态
│  ├─ ops/                 # ★P0-2 声明式 op 语义原语（page/element/layout/state）
│  ├─ element-visual.js    # ★P0-3 元素视觉规格（纯函数，3 个渲染器共用）
│  ├─ id.js                # uid（供 domain 使用）
│  ├─ elements.js          # （保留 + re-export，内部可拆 tree/）
│  ├─ layout.js  page-states.js  snapping.js
├─ client/
│  ├─ model/               # factory.js / storage.js / api.js（normalize 并入 shared/schema）
│  ├─ domain/document.js   # 调用 shared/ops 原语
│  ├─ editor/              # + useLayoutResize / useCanvasZoom / useContextMenu / useActivePage
│  ├─ ui/
│  │  ├─ inspector/        # position/typography/fill/layout/constraints/interactions/page/multi
│  │  ├─ left/             # pagesPanel / docsPanel / layersPanel
│  │  ├─ canvas/           # frame / elementLayer / labels / overlay
│  │  └─ widgets/          # 每元素类型一个文件（+ element-visual adapter）
│  └─ export/              # render/html/png/react → element-visual 的薄 adapter
└─ host/
   ├─ model/               # 分发器 + ops/(page|element|layout|state)
   ├─ doc-store.js  session-bindings.js  doc-library.js
   └─ http.js  tools.js  preview.js  command.js  prompt.js  paths.js  index.js
```

---

## 5. 优先级路线图

| 阶段 | 动作 | 收益 | 风险 | 预估 |
|---|---|---|---|---|
| 0 | **立即修 P0-0**：补 3 行 `import` + duplicate / 容器缩放回归测试 | 消除"复制元素必崩"的线上缺陷 | 极低 | <0.5 天 |
| 1 | 建 `shared/schema.js`，client/host 双端切换 + 对拍测试（P0-1） | 消除跨进程 schema 漂移，最高性价比 | 低（纯函数，可并行保留旧实现对比） | 0.5–1 天 |
| 2 | 抽 `shared/element-visual.js`，三个渲染器改薄 adapter（P0-3） | 视觉一致性；新组件一处生效 | 中（改 3 个渲染器，需视觉回归） | 1–1.5 天 |
| 3 | `shared/ops` 原语化，统一 host `applyOne` 与 client domain（P0-2） | 消除双引擎语义分叉 | 高（触及文档语义），需双向对拍 | 2–3 天 |
| 4 | 拆 UI 巨型组件：inspector / left / canvas / widgets（P1-5） | 可读可测、降合并冲突 | 低（纯展示，props 不变） | 1.5–2 天 |
| 5 | 拆 `panel.js` 编排逻辑 + editor hooks（`useDocument/useGestures/useDocs`）+ 引入 editor Context（P1-4/7） | 组合根回归轻薄、解 prop-drilling | 高（hook 顺序敏感） | 2–3 天 |
| 6 | 拆 `host/store.js`、`model.js#applyOne`（P1-6）；**顺带修 delete/export/rename 归属校验与落盘静默失败** | 宿主可维护性 + 安全 | 中 | 1–1.5 天 |
| 7 | `domain→model` 越层、`model.js` 拆分、`shared/elements` 细分、op-manifest、统一 ID（P2-8/9/10/11） | 分层纯净、少漏改 | 低–中 | 1–1.5 天 |

---

## 6. 重构安全网

- **无循环依赖**（已核验），各拆分点彼此独立，可按阶段小步提交，不必"大爆炸"重写。
- **测试加载方式**：`test/helpers/load-plugin.js` 从 `dist/client.js` 加载**打包产物**（`pretest` 会先 `build`），因此内部文件怎么拆都不影响测试入口；只要行为不变、`pnpm run check`（build + syntax + biome + vitest）通过即可。共 21 个测试文件 / 4,029 行。
- **建议补的测试**：① schema 双端对拍；② op 双引擎对拍；③ element-visual 快照（同一元素在编辑器/HTML/React 输出一致）。这三组是 P0 的护栏。
- **现有覆盖可复用的护栏**（拆分前后都跑）：`host-model.test.js` / `container-model.test.js` / `auto-layout.test.js`（host reducer）、`domain.test.js`（domain 变换）、`default-doc.test.js`（client 归一化）、`export.test.js` / `export-png.test.js`（导出）、`cards.test.js`、`sync.test.js` / `client-sync.test.js` / `session-sync.test.js`（同步与冲突）。**注意：目前没有"client↔host 归一化/op 对拍"测试**——这正是 P0-1/P0-2 最该先补的缺口。
- **必须立刻补的回归测试**：`duplicateElements`（含嵌套容器）与"容器缩放子级约束"——两者当前直接 `ReferenceError`（P0-0），且 `domain.test.js` 无 duplicate 用例。
- **验证命令**：`pnpm run check`；改 Host 半后需重启 Harness 重新加载 `dist/index.js`。

---

### 附：一句话总结

> 分层没错，**别再"各写一份"**——把归一化、变更语义、元素视觉这三件核心资产各收敛成一个 `shared/` 单一来源，再把 `panel` / `inspector` / `widgets` 等"大文件"按职责切开，架构就从"能跑"升级到"好改"。

---

## 7. 修复进度（滚动更新）

> 每个阶段都以 `node scripts/build.mjs && vitest run` 全绿为准；当前 **137 tests / 22 files 全过，biome 0 error**。

- [x] **P0-0 修复 ReferenceError**：`domain/tree.js` 补 `cloneElementDeep`/`uid` 导入，`editor/useGestures.js` 补 `resizeElement` 导入；新增 `test/coupling-regression.test.js` 覆盖复制（含嵌套容器）。
- [x] **P0-1 归一化收敛**：新增 `src/shared/schema.js`（唯一类型表/预设/`normalizeElement|Page|Doc`）；`client/model.js` 与 `host/model.js` 改为调用它，删除双份实现；新增 client↔host 归一化对拍测试（含非法 state 归一、空文档契约）。
- [x] **P2-11 ID 统一**：新增 `src/shared/id.js`；`client/model.js`、`domain/tree.js`、`host/model.js`、`host/store.js`、`shared/page-states.js` 全部改用统一生成器。
- [x] **P1-6a 安全修复**：`host/store.js` 的 `renameDoc/deleteDoc/exportDoc/duplicateDoc` 增加归属校验（跨会话抛 `forbidden`），`writeJson` 失败改为 `console.warn` 不再静默；`host/http.js` 透传 sessionId；新增 `test/store-ownership.test.js`。
- [x] **P1-6b（部分）store 拆分**：持久化 + 单稿 store 抽到 `src/host/store-core.js`，`store.js` 447→311 行，仅保留稿库/会话绑定。
- [x] **P2-8（部分）分层修复**：`domain/document.js` 的 `uid` 改为来自 `shared/id.js`，domain 不再依赖 `model.js`。
- [x] **P0-2（部分）编组命名统一**：client `groupEntries` 改为把名字写入 `el.name`（原 `props.name`），与 host `group_elements` 一致，消除"agent 建的组名在图层不显示"的缺陷。
- [x] **P0-3 元素视觉规格**：新增 `src/shared/element-visual.js`（`ACCENT`/`RADIUS`/`radiusOf`/`fontSizeOf`/`accentOf`/`SAMPLE_TEXT`）；`widgets.js`、`export/render.js`、`export/react.js` 全部改用统一 token；修复 `textAlign`（widgets/react）、React tab 激活色写死 `#6366f1`、React input 状态丢失、两导出 button hover/active 丢失；新增 token 一致性测试。
- [x] **P0-2b 变更引擎原语化**：`shared/elements.js` 新增 `removeElementsFromTree` / `buildGroupFromEntries` / `ungroupChildren`；host `group/ungroup/delete/move` 与 client `groupEntries/ungroupEntry/tree` 全部改为调用共享原语（删除双份 group/ungroup/遍历算法）；新增 group 双引擎对拍测试。
- [x] **P1-5a widgets 拆分**：`widgets.js` 562 行 → `src/client/widgets/{layout,controls,display,content}.js` + `index.js` 注册表（`widgets.js` 变 2 行 shim）；新增注册表完整性测试（每种元素类型都有渲染器）。
- [x] **P1-5b 巨型组件拆分**：`canvas.js` 抽出 `ui/canvas/OverlayLayer.js`（510→472）；`left.js` 570→129，拆为 `ui/left/{labels,DocsPanel,PagesPanel,LibraryPanel,LayersPanel}.js`；`inspector.js` 877→176，拆为 `ui/inspector/{ElementPanel,MultiSelectPanel,PageFrameEditor}.js`（外壳只做分支分发）；`chooseImageFile` 移到 `editor/pickImage.js`（兼 P1-8）。
- [x] **P2-12 cards 拆分**：`cards.js` 353 行 → `src/client/cards/{openCanvas,meta,preview,ProductDesignCard,register}.js` + 入口 re-export shim（公开 API 不变，测试通过）。
- [x] **P1-8a commandFace 移出 ui/**：`ui/commandFace.js` → `hostIntegration/commandFace.js`（它其实是 monkey-patch 宿主 `commandUi` 服务，不是渲染）。
- [x] **P2-8b client/model.js 拆分**：`model.js` 128 行 → `client/model/{factory,storage,api}.js` + 8 行入口 shim（工厂/归一化、localStorage、HTTP 客户端分离）。
- [x] **P2-9a i18n 拆分**：`i18n.js` 535 行 → `client/i18n/{zh,en,index}.js` + 2 行 shim。
- [x] **P1-4 panel 拆分**：`panel.js` 577→462；抽出 `editor/{usePanelResize,useCanvasZoom,useActivePage,useToast,useContextMenu}.js` + `panel/viewModels.js`（预览/面包屑纯计算）。剩下主要是 hook 装配与少量内联 bar JSX，属组合根本职。
- [x] **P2-10 op-manifest**：新增 `src/shared/ops-manifest.js`（`OP_KINDS`/`OP_SIGNATURES`）；`host/tools.js` 的工具描述与 `host/prompt.js` 的操作清单都改由它生成（原来三处各写一份）。
- [x] **P1-6b-b applyOne 拆分**：`host/model.js` 467→172 行；把原 ~300 行 `applyOne` 大 switch 拆成 `host/model/ops/{pages,elements,arrange}.js`（每类 handler 通过 `deps` 注入 model 局部 helper），`applyOne` 变纯分派器；142 tests 全过（host-model/container-model/auto-layout 覆盖各 op）。
- [x] **P1-6c http 拆分**：`host/http.js` 199→164 行，抽出 `host/http/{security.js,sse.js}`（同源护栏 / SSE 流）。`store.js` 已拆出 `store-core.js`（310 行，剩余 createStores 为闭包式稿库/会话绑定，属可接受范围）。
- [~] **P1-7 hooks 拆分（大部分）**：`docs.js` 177→136 抽出 `docs-api.js`；`useDocument.js` 538→482 抽出 `editor/doc-client.js`（I/O 收口）与 `editor/docHistory.js`（undo/redo 纯算法，含单测）；`useGestures.js` 480→426 抽出 `editor/{gestureUtils.js,useSpacePan.js}`。剩余 `useGestures` drag/resize 深层状态机与 editor Context 属高风险项，标注为后续。
- [x] **P1-8 ui 纯度**：`ui/` 已无 `window.confirm/alert/innerWidth/innerHeight`；删除确认移到 panel（editor 层），图片过大的 `alert` 改走 toast，viewport 由 `editor/useViewport.js` 经 props 注入 CanvasView / OverlayLayer / ContextMenu；`chooseImageFile`、`commandFace` 早已移出 ui。
- [x] **P2-9b shared/elements 细分**：`shared/elements.js` 397→8 行 shim，拆为 `shared/elements/{base,query,geometry,mutate}.js`（基础判定/查询/几何/树变换），导入路径不变（`export *`）。

> 当前验证：**138 tests / 23 files 全过，biome 0 error**（build 通过）。

---

## 8. 最终结果（完成度总览）

最终校验：`node scripts/build.mjs` 通过、`node --check` 通过、**vitest 145 tests / 24 files 全过**、`biome 0 error`。

关键巨型文件拆分前后（行）：

| 文件 | 原 | 现 |
|---|---:|---|
| `client/widgets.js` | 562 | 2 行 shim + `widgets/{layout,controls,display,content,index}.js` |
| `client/cards.js` | 353 | 10 行 shim + `cards/{openCanvas,meta,preview,ProductDesignCard,register}.js` |
| `client/ui/inspector.js` | 877 | 178 + `inspector/{ElementPanel,MultiSelectPanel,PageFrameEditor}.js` |
| `client/ui/left.js` | 570 | 129 + `left/{labels,DocsPanel,PagesPanel,LibraryPanel,LayersPanel}.js` |
| `client/panel.js` | 577 | 469 + `editor/{usePanelResize,useCanvasZoom,useActivePage,useToast,useContextMenu,useViewport}.js` + `panel/viewModels.js` |
| `client/model.js` | 218 | 9 行 shim + `model/{factory,storage,api}.js` |
| `client/i18n.js` | 535 | 2 行 shim + `i18n/{zh,en,index}.js` |
| `client/editor/useDocument.js` | 538 | 481 + `editor/{doc-client,docHistory}.js` |
| `client/editor/useGestures.js` | 479 | 426 + `editor/{gestureUtils,useSpacePan}.js` |
| `host/model.js` | 627 | 172 + `host/model/ops/{pages,elements,arrange}.js` |
| `host/store.js` | 447 | 310 + `host/store-core.js` |
| `host/http.js` | 199 | 164 + `host/http/{security,sse}.js` |
| `shared/elements.js` | 397 | 8 行 shim + `shared/elements/{base,query,geometry,mutate}.js` |

单一来源消除重复：`shared/schema.js`（归一化/类型表，client↔host 对拍测试）、`shared/element-visual.js`（视觉 token）、`shared/id.js`（ID）、`shared/ops-manifest.js`（op 词汇）、`shared/elements/*`（树/组原语，双引擎对拍）。

已修复的缺陷：复制元素 `ReferenceError`（P0-0）、client↔host 归一化漂移、client↔host group 命名不一致、导出 textAlign/state/accent 漂移、store 跨会话 delete/export/rename 越权、writeJson 静默失败。

**如实说明——两项"高风险深拆"作为可选后续保留**（不影响功能，全部测试通过）：
- `useGestures` 内层 drag/resize 闭包状态机未再细拆（已抽出纯几何 `gestureUtils` 与 `useSpacePan`；深拆收益低、回归风险高，建议配合交互测试再做）。
- `editor Context`（把 panel→ui 的扁平 props 改为 context）：属可维护性优化，未实施。
- `store.js` 的 `createStores` 仍为闭包式（`store-core.js` 已抽出）。
