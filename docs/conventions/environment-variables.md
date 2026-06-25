# 环境变量规范

环境变量遵循“配置归应用、解析能力共享”的原则：

- 每个 Vite 应用只读取自己目录下的 `.env*`。
- React 与 Vue 应用可以独立配置名称、接口地址和应用专属变量。
- `packages/shared/config` 只负责解析、默认值和校验，不直接读取
  `import.meta.env`。
- 根目录不存放应用级 `VITE_*` 文件，避免多个应用共享隐式配置。

## 目录结构

每个应用都包含以下环境文件：

```txt
apps/<app>/
├─ .env.example
├─ .env
├─ .env.development
├─ .env.test
├─ .env.uat
├─ .env.production
├─ .env.development.local   # 可选，不提交
├─ .env.test.local          # 可选，不提交
├─ .env.uat.local           # 可选，不提交
└─ .env.production.local    # 可选，不提交
```

两个应用的 Vite 配置不设置 `envDir`，因此 Vite 会默认从应用根目录加载环境文件。

各文件职责：

- `.env`：所有 mode 共用的稳定配置，例如应用名和开发服务器端口。
- `.env.<mode>`：仅属于某个环境的差异配置，例如环境标识和 API 地址。
- `.env.example`：完整变量清单，方便复制和了解应用需要哪些变量。
- `.env.local`、`.env.<mode>.local`：开发者或机器的私有覆盖，不提交 Git。

当前公共配置示例：

```env
BUILD_SOURCEMAP=false
DEV_PROXY_PREFIX=/api
DEV_SERVER_HOST=0.0.0.0
DEV_SERVER_OPEN=false
DEV_SERVER_PORT=5174
VITE_APP_NAME=React Web
```

当前环境差异示例：

```env
DEV_PROXY_TARGET=http://localhost:3000
VITE_APP_ENV=uat
VITE_API_BASE_URL=https://uat-api.example.com
```

## 环境模式

| Mode          | 用途              | 环境文件           |
| ------------- | ----------------- | ------------------ |
| `development` | Vite 本地开发模式 | `.env.development` |
| `test`        | 通用测试环境      | `.env.test`        |
| `uat`         | 用户验收测试环境  | `.env.uat`         |
| `production`  | 正式生产环境      | `.env.production`  |

Vite 使用 `MODE` 决定加载哪个文件，应用使用 `VITE_APP_ENV` 标识业务环境。执行
`vite build --mode uat` 时，Vite 仍然执行生产优化构建，
`import.meta.env.MODE` 和 `VITE_APP_ENV` 的值均为 `uat`。

本地环境是一个例外：Vite 使用标准的 `development` mode，业务配置使用
`VITE_APP_ENV=local`。不要使用 `NODE_ENV` 区分 test、UAT 等业务环境。

常见环境顺序：

```txt
local -> test -> uat -> production
```

- `local`：开发者本机开发和调试。
- `test`：开发自测、功能测试、自动化测试及前后端集成联调。
- `uat`：业务方或最终用户验收。
- `production`：正式生产环境。

## 加载优先级

以 UAT 模式为例，Vite 会加载：

```txt
.env
.env.local
.env.uat
.env.uat.local
```

后加载的文件拥有更高优先级。本项目提交 `.env` 作为公共基线，但不创建
`.env.local`。开发者需要覆盖所有 mode 时可创建 `.env.local`，只覆盖 UAT 时创建
`.env.uat.local`。

操作系统中已存在的同名环境变量优先级高于环境文件。CI 可以通过 GitLab CI/CD
Variables 注入变量，覆盖仓库中的公开默认值。

## 启动命令

React：

```bash
pnpm dev:react
pnpm dev:react:local
pnpm dev:react:test
pnpm dev:react:uat
```

Vue：

```bash
pnpm dev:vue
pnpm dev:vue:local
pnpm dev:vue:test
pnpm dev:vue:uat
```

不指定 mode 的 `vite` 开发服务器默认使用 `development`。因此 `dev:react` 与
`dev:react:local` 等价，Vue 同理；显式 local 命令用于脚本和团队沟通时提高可读性。

## 构建命令

React：

```bash
pnpm build:react:local
pnpm build:react:test
pnpm build:react:uat
pnpm --filter @apps/react-web build
```

Vue：

```bash
pnpm build:vue:local
pnpm build:vue:test
pnpm build:vue:uat
pnpm --filter @apps/vue-web build
```

应用原有的 `build` 命令使用 Vite 默认的 `production` mode。

## 客户端变量

只有 `VITE_` 前缀变量会暴露给浏览器：

```env
DEV_PROXY_PREFIX=/api
DEV_PROXY_TARGET=http://localhost:3000
DEV_SERVER_HOST=0.0.0.0
DEV_SERVER_OPEN=false
DEV_SERVER_PORT=5174
VITE_APP_ENV=uat
VITE_APP_NAME=React Web (UAT)
VITE_API_BASE_URL=https://uat-api.example.com
```

- `DEV_PROXY_PREFIX`：开发代理的请求前缀，例如 `/api`。
- `DEV_PROXY_TARGET`：当前 mode 的代理目标；未配置时不启用代理。
- `DEV_SERVER_HOST`：Vite 开发服务器监听地址。
- `DEV_SERVER_OPEN`：启动后是否自动打开浏览器，仅 `"true"` 表示开启。
- `DEV_SERVER_PORT`：Vite 开发服务器端口，只供 `vite.config.ts` 使用，不会暴露给
  浏览器。
- `VITE_APP_ENV`：业务环境标识，允许 `local`、`test`、`uat`、`production`。
- `VITE_APP_NAME`：应用显示名称；未配置时使用 `Frontend App`。
- `VITE_API_BASE_URL`：接口基础地址；可以是 `/api` 或完整 URL。

每个应用通过 `src/env.d.ts` 声明变量类型，并且只在
React 的 `src/hooks/useRuntimeConfig.ts` 和 Vue 的
`src/composables/useRuntimeConfig.ts` 读取 `import.meta.env`。页面、feature
和 UI 组件应使用解析后的运行时配置，不要直接访问环境变量。

`vite.config.ts` 使用 `loadEnv(mode, appRoot, "")` 读取配置端变量，并校验端口、
代理前缀和代理目标。所有 `DEV_*` 变量都不带 `VITE_` 前缀，因此不会被注入客户端
代码。

本地开发访问 `/api/users` 时，Vite 会代理到
`http://localhost:3000/users`。test、UAT 和 production 当前未声明
`DEV_PROXY_TARGET`，因此不会启用本地代理。

`BUILD_SOURCEMAP` 和仅由分析命令注入的 `BUILD_ANALYZE` 也属于构建端变量，不会进入
客户端运行时配置。

Playwright 支持通过进程环境变量指定已经部署的测试目标：

```env
E2E_BASE_URL=https://test.example.com
```

`E2E_BASE_URL` 不写入应用 `.env`，也不暴露给浏览器。未设置时 Playwright 根据应用
`.env` 中的 `DEV_SERVER_PORT` 自动启动本地 Vite；设置后直接测试目标地址，不启动本地
服务。CI 应通过 GitLab CI/CD Variables 注入实际 test 或 UAT 地址。

## 共享解析与校验

应用将 `import.meta.env` 传给 `@repo/config`：

```ts
const config = createAppConfig(import.meta.env);
```

共享模块负责：

- 去除字符串首尾空格。
- 提供安全默认值。
- 拒绝空字符串。
- 校验 API 地址格式。
- 优先读取 `VITE_APP_ENV`，并规范为 `local`、`development`、`test`、`uat` 或
  `production`。

共享模块不能导入 Vite，也不能自行读取 `import.meta.env`，从而保持框架和构建工具
无关，便于单元测试和其他运行时复用。

## Git 提交规则

允许提交：

- `.env.example`：变量模板和本地配置参考。
- `.env`：所有环境共用的公开配置。
- `.env.development`：公开的开发环境差异配置。
- `.env.test`、`.env.uat`：公开的测试与验收环境默认值。
- `.env.production`：可以进入客户端产物的公开生产配置。

禁止提交：

- `.env.local`。
- `.env.*.local`。
- Token、私钥、数据库密码和服务端密钥。

所有 `VITE_*` 值都可能出现在浏览器构建产物中，即使文件没有提交 Git，也不能用来
保存秘密。

## GitLab CI 接入建议

GitLab CI 当前只保留方案、不在模板中实现。后续接入时，流水线可以按部署目标调用：

```bash
pnpm build:vue:test
pnpm build:vue:uat
pnpm build:react:uat
```

公开默认值可以保留在对应 `.env.<mode>` 中。需要保护或按项目变化的值通过 GitLab
CI/CD Variables 注入，并为生产变量启用 Protected 和 Masked 等权限设置。

## 新增环境变量

新增公共变量时：

1. 在应用的 `.env.example` 中补充变量清单。
2. 所有环境相同的值放入 `.env`，存在差异的值放入对应 `.env.<mode>`。
3. 客户端变量在应用的 `src/env.d.ts` 中补充类型。
4. 在 `@repo/config` 的 `RuntimeEnv`、`AppConfig` 和解析函数中增加校验。
5. 为解析成功、默认值和非法值增加测试。
6. 更新本文档。

只属于一个应用的变量应由该应用自己声明和解析，不要为了复用表面一致的字段而扩大
公共配置接口。

只供 Vite、Node.js 脚本或 CI 使用的变量不要添加 `VITE_` 前缀，也不需要写入
`src/env.d.ts`。
