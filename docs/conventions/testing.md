# 测试分层规范

## 目标

测试用于保护公共契约和关键用户行为，不以追求测试数量或巨大快照为目标。
当前仓库落地单元测试和组件测试，E2E 作为下一阶段能力保留。

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

Playwright 暂未安装。下一阶段只为高价值流程增加 E2E：

- 登录和退出。
- 核心业务提交。
- 权限拦截。
- 应用启动和关键路由可访问性。

E2E 不应重复覆盖所有组件细节。

## 配置位置

每个应用维护自己的测试配置：

```txt
apps/react-web/vitest.config.ts
apps/react-web/src/test/setup.ts
apps/vue-web/vitest.config.ts
apps/vue-web/src/test/setup.ts
```

独立配置允许 React 和 Vue 使用各自的 Vite 插件，同时共享以下约定：

- 测试环境：happy-dom。
- 断言扩展：`@testing-library/jest-dom`。
- 自动清理已渲染组件。
- 覆盖率：V8，输出 text、HTML 和 LCOV。
- 覆盖率产物：应用自己的 `coverage/`，不提交 Git。

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

## 覆盖率策略

当前不设置全仓统一百分比门槛。模板中的示例页面较少，过早设置数字会诱导
无价值测试。开始真实业务开发后，应按模块风险逐步增加阈值：

- 公共请求、权限、金额和配置模块优先设置较高阈值。
- 纯展示页面可以保持较低阈值。
- 新增缺陷修复必须增加对应回归测试。
- 覆盖率下降应在 Merge Request 中说明原因。
