# @repo/observability

框架无关的可观测性契约。目前先提供统一错误上报接口，不直接绑定 Sentry、
Datadog 等具体平台。

```txt
src/
  error-reporting/
    console-error-reporter.ts
    create-error-reporter.ts
    error-reporter.types.ts
    normalize-error.ts
    index.ts
  index.ts
```

应用通过 `createErrorReporter` 组合一个或多个适配器：

```ts
import { consoleErrorReporter, createErrorReporter } from "@repo/observability";

export const errorReporter = createErrorReporter([
  consoleErrorReporter,
  // 后续可在这里增加 Sentry 适配器。
]);
```

公共包只负责规范错误数据和分发。React Error Boundary、Vue
`errorHandler`、路由信息及用户信息由应用层提供。
