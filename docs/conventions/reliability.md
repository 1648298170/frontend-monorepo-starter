# 请求与异常处理架构

## 设计原则

可靠性能力分为三个层级：

```txt
packages/shared/request
  提供 HTTP 请求协议能力

packages/shared/observability
  提供框架无关错误上报契约

apps/*/src/app/error-handling
  连接 React、Vue、Router 和具体监控平台
```

公共包不读取 Router、Store 或环境变量，也不决定是否退出登录。应用负责把
业务策略注入公共接口。

## 请求层

`@repo/request` 当前提供：

- Base URL 拼接。
- 异步 Token 获取。
- 调用方 Header 优先级。
- 默认 30 秒超时和单请求超时覆盖。
- 标准 `AbortSignal` 主动取消。
- 请求、响应和错误扩展钩子。
- JSON/文本响应解析。
- `HttpError` 和 `RequestTimeoutError`。

应用可以在 `onRequest` 注入租户、语言、追踪 ID 等 Header，在 `onError`
处理业务错误码或上报监控。

React 和 Vue 应用都在 `app/runtime/runtime-services.ts` 中创建唯一的运行时
配置和请求客户端。Hook/Composable 只返回该服务对象，多个页面不会重复创建
客户端、拦截器和配置实例。

当前两个模板应用会忽略用户主动取消和可预期的 4xx，仅将超时、网络异常和
5xx 交给全局 reporter。表单校验等 4xx 应由具体业务页面展示。

Token 自动刷新暂未内置。实现时应在应用层维护单例刷新任务，避免多个并发
401 同时刷新，并通过拦截器重放原请求。公共客户端不应直接访问用户 Store。

## 错误上报

`@repo/observability` 将未知异常规范化为 `Error`，补充 `source`、
`timestamp` 和可选 `context`，再分发给多个 reporter。

当前应用默认使用控制台 reporter。接入 Sentry 等平台时，在应用的
`error-reporter.ts` 增加适配器即可：

```ts
export const errorReporter = createErrorReporter([
  consoleErrorReporter,
  sentryErrorReporter,
]);
```

单个 reporter 失败不会阻止其他 reporter，也不会覆盖原始业务异常。

## React

React 应用包含两层保护：

- `AppErrorBoundary` 捕获 Router 外层或普通组件渲染异常。
- `RouteErrorPage` 处理 React Router 的 loader、action、lazy 和路由渲染错误。

两者都展示统一恢复页面，并向 reporter 提供当前路由和组件堆栈。

## Vue

Vue 应用包含三类保护：

- `AppErrorBoundary` 使用 `onErrorCaptured` 捕获页面组件树异常。
- `app.config.errorHandler` 捕获边界之外的 Vue 全局异常。
- `router.onError` 捕获懒加载和导航异常。

错误边界负责展示恢复页面，全局处理器只负责上报，不直接操作页面状态。

## 安全约定

- 生产错误页不展示异常 message、stack、接口 payload 或用户信息。
- Reporter context 不得包含 Token、密码、Cookie 和完整身份证件信息。
- 请求日志默认不记录 Authorization Header。
- 用户可恢复的表单校验错误不应进入全局 Error Boundary。

## 后续阶段

- Sentry 或公司内部监控平台适配器。
- Trace ID 在请求层和错误上报之间贯通。
- Token 刷新并发控制。
- 统一业务错误码到用户提示的映射。
- Playwright 验证错误页和关键业务恢复流程。
