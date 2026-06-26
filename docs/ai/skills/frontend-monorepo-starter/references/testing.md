# 测试规范

处理单元测试、组件测试、页面测试、Playwright、测试工具配置时，先读：

```text
docs/conventions/testing.md
packages/tooling/playwright-config/README.md
apps/react-web/vitest.config.ts
apps/vue-web/vitest.config.ts
apps/react-web/playwright.config.ts
apps/vue-web/playwright.config.ts
```

## 测试分层

- 纯函数和共享包：Vitest 单元测试。
- React 组件：Testing Library React。
- Vue 组件：Testing Library Vue。
- 应用冒烟和关键用户链路：Playwright。
- 页面级单元测试只在页面有明确业务组合逻辑时添加，不为了覆盖率机械增加。

## 组件测试原则

- 从用户视角断言可见内容和交互。
- 不读取组件内部状态。
- Mock 运行时配置和外部服务，避免测试依赖真实环境变量或后端。
- 组件示例测试应简洁，作为同事参考。

## E2E 规范

- E2E 放在应用自己的 `e2e/`。
- 共享浏览器、报告和 webServer 策略来自 `@repo/playwright-config`。
- 默认 `pnpm test:e2e` 跑 Chromium。
- 跨浏览器用 `pnpm test:e2e:all`。
- 远程环境使用 `E2E_BASE_URL`，不要写入应用 `.env`。

## 常用命令

```bash
pnpm test
pnpm test:e2e
pnpm test:e2e:react
pnpm test:e2e:vue
pnpm test:e2e:install
pnpm test:e2e:install:all
```
