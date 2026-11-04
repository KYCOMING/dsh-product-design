# 贡献指南

## 环境

- Node.js >= 20（见 `.nvmrc`）
- pnpm

```bash
pnpm install
```

## 开发流程

1. 从 `main` 拉分支：`feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`。
2. 改动后本地跑通全部检查：
   ```bash
   pnpm run check   # syntax + lint + test
   ```
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
   - `feat: 新增页面拖拽排序`
   - `fix: 修复窄侧栏组件库溢出`
   - `docs:` / `refactor:` / `test:` / `chore:`
4. 提交 PR，CI 必须通过。

## 代码约定

- `client.js` 目前是单文件客户端模块，新增逻辑请尽量放进对应「逻辑分层」区块，并保持纯逻辑（模型 / 历史 / 几何）与 React 渲染分离，方便后续拆包与测试。
- 所有面向用户的文案必须同时更新 `DICT.zh` 与 `DICT.en`（后续会加 i18n key 对齐测试）。
- 修改 `doc` 数据结构时，必须同步提升 schema 版本并补迁移逻辑与迁移测试。

## 测试

- 行为测试位于 `test/`，使用 vitest + jsdom，直接加载 `client.js` 并挂载 React 组件验证真实交互。
- 新增交互或修复 bug 时，应补充对应用例。

## 发布（可选）

1. 更新 `CHANGELOG.md` 与 `package.json` 版本号（semver）。
2. 打 tag：`git tag v1.x.x && git push --tags`。
3. 如需发布 npm：将 `private` 改为 `false`，补齐 `repository` 后 `pnpm publish`。
