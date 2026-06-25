# 测试分层规范

## 目标

测试用于保护公共契约和关键用户行为，不以追求测试数量或巨大快照为目标。
当前仓库使用 Vitest 保护单元与组件契约，使用 Playwright 保护跨页面和真实浏览器中的
关键用户行为。

## 测试层级

### 单元测试

适用范围：

- `packages/shared/*` 中的纯函数和公共 API。
- 请求客户端、配置解析、格式化和错误模型。
- 不依赖真实浏览器和后端服务的业务规则。

测试文件与源码放在同一目录，使用 `*.test.ts` 命名。测试应覆盖公开行为和
边界条件，不直接验证内部私有实现。

### 组件测试

React 使用 Testing Library React，Vue 使用 Testing Library Vue。两个应用都
使用 Vitest 和 happy-dom。

组件测试优先通过以下方式查找元素：

1. `getByRole`
2. `getByLabelText`
3. `getByText`
4. 只有缺少语义化查询时才使用 `data-testid`

测试应模拟点击、输入和路由行为，不直接读取组件内部 state、ref、computed
或私有方法。快照不能作为功能测试的唯一断言。

### 页面测试

页面级单元或集成测试不是每个页面都必须编写。页面只是组合已测试 feature
时，再测试一次相同静态内容通常收益较低。

以下页面建议增加测试：

- 根据路由参数、查询参数或权限决定展示内容。
- 编排多个 feature，并处理它们之间的事件或状态。
- 负责页面级加载、空状态、错误状态和重试。
- 提交关键业务流程或包含重要条件分支。
- 修复过页面级回归问题，需要保留对应回归用例。

以下页面通常不需要单独测试：

- 只渲染一个已经完成组件测试的 feature。
- 没有路由逻辑、数据请求、权限判断或用户交互。
- 断言内容会和子组件测试完全重复。

当前 `HomePage` 只负责渲染 `TemplateOverview`，因此保留
`TemplateOverview` 组件测试即可，不额外增加重复的页面测试。等页面开始处理
路由参数或业务编排后，再将它升级为页面级集成测试。

### E2E 测试

Playwright 用于高价值用户流程：

- 应用启动和关键路由可访问性。
- 登录和退出。
- 核心业务提交。
- 权限拦截。
- 真实浏览器中的导航、下载、弹窗和多标签页行为。

E2E 不应重复覆盖所有组件细节，也不应断言 React state、Vue ref 或内部 CSS 类名。
查询顺序优先使用 `getByRole`、`getByLabel` 和可见文本；只有缺少稳定语义时才增加
`data-testid`。

当前 React 与 Vue 应用各提供一个首页冒烟用例，验证开发服务、路由、应用挂载和共享 UI
能够在真实 Chromium 中协同工作。

## 配置位置

每个应用维护自己的测试配置：

```txt
apps/react-web/vitest.config.ts
apps/react-web/src/test/setup.ts
apps/react-web/playwright.config.ts
apps/react-web/e2e/
apps/vue-web/vitest.config.ts
apps/vue-web/src/test/setup.ts
apps/vue-web/playwright.config.ts
apps/vue-web/e2e/
```

独立配置允许 React 和 Vue 使用各自的 Vite 插件，同时共享以下约定：

- 测试环境：happy-dom。
- 断言扩展：`@testing-library/jest-dom`。
- 自动清理已渲染组件。
- 覆盖率：V8，输出 text、HTML 和 LCOV。
- 覆盖率产物：应用自己的 `coverage/`，不提交 Git。

Playwright 的跨应用稳定策略放在
`packages/tooling/playwright-config`：

- Chromium、Firefox、WebKit 浏览器项目。
- CI 重试、Worker 和 `test.only` 防护。
- HTML、JUnit、Trace、失败截图与视频。
- 本地 Vite 服务自动启动和复用。
- 每个应用独立的 `reports/playwright/<app>` 报告目录。

业务账号、测试数据、登录态和页面夹具属于应用，不进入 tooling。建议按需求逐步增加：

```txt
e2e/
  fixtures/       # 登录态、租户和测试数据装配
  pages/          # 多个场景重复操作同一页面后再引入
  smoke.spec.ts   # 启动和关键路由冒烟
  auth.spec.ts    # 认证业务流程
```

页面对象应按业务域保持小接口，不创建覆盖整个系统的巨型 Page Object。

## 常用命令

运行全仓测试：

```bash
pnpm test
```

运行单个应用测试：

```bash
pnpm --filter @apps/react-web test
pnpm --filter @apps/vue-web test
```

生成应用覆盖率报告：

```bash
pnpm --filter @apps/react-web test:coverage
pnpm --filter @apps/vue-web test:coverage
```

首次运行 E2E 前安装 Chromium：

```bash
pnpm test:e2e:install
```

日常运行两个应用的 Chromium E2E：

```bash
pnpm test:e2e
```

只运行一个应用：

```bash
pnpm test:e2e:react
pnpm test:e2e:vue
```

调试单个应用：

```bash
pnpm --filter @apps/react-web test:e2e:ui
pnpm --filter @apps/vue-web test:e2e:headed
```

需要完整跨浏览器回归时，先安装全部浏览器，再执行：

```bash
pnpm test:e2e:install:all
pnpm test:e2e:all
```

测试已经部署的 test 或 UAT 环境时，通过 `E2E_BASE_URL` 覆盖目标地址。此时 Playwright
不会启动本地 Vite：

```bash
cross-env E2E_BASE_URL=https://test.example.com \
  pnpm --filter @apps/react-web test:e2e
```

PowerShell 也可以先执行 `$env:E2E_BASE_URL="https://test.example.com"`，再运行应用
E2E 命令。

HTML、JUnit、Trace、截图和视频统一输出到 `reports/playwright/<app>`，该目录不提交
Git。失败后可以运行应用的 `test:e2e:report` 查看 HTML 报告。

## 覆盖率策略

当前不设置全仓统一百分比门槛。模板中的示例页面较少，过早设置数字会诱导
无价值测试。开始真实业务开发后，应按模块风险逐步增加阈值：

- 公共请求、权限、金额和配置模块优先设置较高阈值。
- 纯展示页面可以保持较低阈值。
- 新增缺陷修复必须增加对应回归测试。
- 覆盖率下降应在 Merge Request 中说明原因。
