# Changelog

本文件记录 dsh-product-design 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 工程化骨架：git 仓库、`.gitignore` / `.editorconfig` / `.nvmrc`、README / CHANGELOG / CONTRIBUTING / LICENSE。
- `package.json` 补充 `engines`、`peerDependencies`、`scripts`、`devDependencies`。
- 行为回归测试入库（vitest + jsdom）：插件注册、整树渲染、撤销/重做、快捷键、拖拽、平移。
- Biome 格式化 / 检查与 GitHub Actions CI。

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
