# @repo/config

框架无关的运行时配置解析模块。

```txt
src/
  app-config/
    app-config.types.ts
    create-app-config.ts
    create-app-config.test.ts
    index.ts
  index.ts
```

- 每类配置使用独立模块，类型、解析逻辑和测试放在一起。
- `RuntimeEnv` 隔离 Vite 环境变量与应用配置之间的差异。
- 应用只消费解析后的 `AppConfig`，不在页面中散落环境变量读取。
- 空字符串和非法 API 地址会抛出 `AppConfigError`，让配置问题尽早暴露。
- `VITE_APP_ENV` 会规范为 `local`、`development`、`test`、`uat` 或
  `production`，未提供时回退读取 Vite 的 `MODE`。

环境文件由各应用独立维护，共享包不读取文件，也不依赖 Vite：

```ts
import { createAppConfig } from "@repo/config";
import type { AppConfig } from "@repo/config/app-config";

const config = createAppConfig(import.meta.env);
```
