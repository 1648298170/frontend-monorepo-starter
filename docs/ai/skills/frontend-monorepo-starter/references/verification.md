# 验证矩阵

根据变更类型选择最小但足够的验证命令。

## 通用代码变更

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
```

## 依赖变更

```bash
pnpm install
pnpm lint:unused
pnpm typecheck
pnpm test
pnpm build
```

## 应用模板或生成器变更

```bash
pnpm test:scripts
pnpm verify:app-templates
```

## Vite、构建或分包变更

```bash
pnpm typecheck
pnpm build
```

必要时检查应用产物：

```bash
Get-ChildItem apps/react-web/dist -Recurse
Get-ChildItem apps/vue-web/dist -Recurse
```

## 样式体系变更

```bash
pnpm lint:style
pnpm build
```

## Playwright 或 E2E 变更

```bash
pnpm test:e2e
```

如果改了跨浏览器配置：

```bash
pnpm test:e2e:install:all
pnpm test:e2e:all
```

## 文档-only 变更

```bash
pnpm format:check
```

如果文档涉及命令、依赖或模板流程，仍应运行相关命令确认描述没有过期。

## 提交前自检

- 工作树只包含本次任务相关文件。
- 没有临时应用、reports、dist 或 `.turbo` 被误提交。
- `pnpm-lock.yaml` 只有真实依赖变化导致的差异。
- 最终回复说明已运行和未运行的验证。
