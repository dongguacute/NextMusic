# NextMusic Monorepo

基于 `pnpm workspace` + `Turborepo` 的前端 monorepo。

## 目录结构

- `apps/*`: 应用工程（当前包含 `apps/nextmusic`）
- `packages/*`: 可复用包（组件库、工具库、配置包等）

## 使用方式

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## 说明

- 根目录通过 `pnpm-workspace.yaml` 统一管理工作区。
- `pnpm dev` 默认只启动 `nextmusic` 应用，避免误启动其他包的长期任务。
