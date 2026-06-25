# @repo/eslint-config

`@repo/eslint-config` 是 Monorepo 的共享 ESLint Flat Config 包，负责统一代码质量、
框架规则、运行环境和依赖边界。根目录 `eslint.config.js` 是唯一的组合入口，各应用
无需再创建重复的 ESLint 配置。

## 目录与职责

```txt
eslint-config/
├─ base.js          # JavaScript、TypeScript 基础规则
├─ browser.js       # 浏览器运行环境全局变量
├─ node.js          # Node.js 运行环境全局变量
├─ naming.js        # 标识符、文件和目录命名规则
├─ react.js         # React Hooks 与 Fast Refresh
├─ vue.js           # Vue SFC 与 TypeScript 解析
├─ boundaries.js    # Monorepo 依赖方向与公开入口约束
├─ package.json     # 包入口和运行依赖
└─ README.md
```

各文件保持单一职责，根配置按需要组合它们。这样新增规则时可以明确判断它属于语言、
环境、框架还是架构层，避免形成难以维护的单体配置文件。

## 根配置组合方式

当前根 `eslint.config.js` 的核心组合顺序如下：

```js
export default [
  ...baseConfig,
  ...browserConfig,
  ...nodeConfig,
  ...reactConfig,
  ...reactAppConfig,
  ...vueConfig,
  ...boundaryConfig,
  eslintConfigPrettier,
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/*.d.ts",
    ],
  },
];
```

Flat Config 按数组顺序合并，后面的配置可以覆盖前面的配置。因此：

- `baseConfig` 最先提供通用基线。
- 环境和框架配置在基线上增加能力。
- `boundaryConfig` 对最终代码施加架构限制。
- `namingConfig` 检查稳定、低误报的源码命名约定。
- `eslintConfigPrettier` 靠后放置，关闭与 Prettier 冲突的格式规则。
- `ignores` 集中声明生成目录和无需检查的文件。

新增配置时要关注顺序，避免无意覆盖已有规则。

## 配置入口说明

### `@repo/eslint-config/base`

适用于仓库内所有 JavaScript 和 TypeScript 源码，包含：

- ESLint 官方 JavaScript 推荐规则。
- typescript-eslint 推荐规则。
- 最新 ECMAScript 语法。
- ESM 模块解析方式。

它不声明浏览器或 Node.js 全局变量，也不包含 React、Vue 规则，因此可以作为所有
项目的稳定基础。

### `@repo/eslint-config/browser`

为以下目录启用 `window`、`document`、`fetch` 等浏览器全局变量：

```txt
apps/**
packages/react/**
packages/vue/**
packages/shared/request/**
```

仅依赖 TypeScript 标准库、不访问浏览器 API 的 shared 包不应加入该范围，否则会掩盖
错误的运行环境依赖。

### `@repo/eslint-config/node`

为根配置、工具配置和 tooling 包启用 `process`、`Buffer` 等 Node.js 全局变量，主要
匹配：

```txt
*.js
*.ts
**/*.config.js
**/*.config.ts
packages/tooling/**
```

如果新增独立 CLI 或 Node.js 服务包，应扩展这里的通用目录模式，或为该场景新增单独
配置入口。

### `@repo/eslint-config/naming`

用于检查：

- TypeScript 类型、函数、参数和变量命名。
- React、Vue 组件及页面文件使用 PascalCase。
- Store、routes、types、schema、API、service 等职责文件使用 kebab-case。
- 应用和共享包 `src` 下的业务目录使用 kebab-case。

该配置不检查对象属性和所有普通 TypeScript 文件，避免影响后端字段、第三方 SDK 和
框架入口文件。完整约定见 `docs/conventions/naming.md`。

### `@repo/eslint-config/react`

该入口导出两个配置：

- `reactConfig`：React Hooks 推荐规则，适用于 React 应用和 React 共享包。
- `reactAppConfig`：Fast Refresh 规则，只适用于 `apps/react-*` 下的 JSX/TSX。

拆分的原因是 UI 组件库可能由其他工具构建，不应天然继承 Vite 应用的热更新导出
限制。

自动匹配目录：

```txt
apps/react-*
packages/react/*
```

### `@repo/eslint-config/vue`

为 Vue 应用和 Vue 共享包启用：

- `eslint-plugin-vue` 官方 Flat Config 推荐规则。
- Vue SFC 中 `<script lang="ts">` 的 TypeScript 解析。
- 当前业务模板允许的 Vue 规则覆盖。
- 与 Prettier 重叠的模板排版规则关闭。

匹配范围分为两层：

```txt
apps/vue-*/**/*.{ts,vue}
packages/vue/**/*.{ts,vue}
```

以上范围承载 Vue 项目的 TypeScript 规则覆盖；下面的范围只处理 Vue SFC 解析和模板
规则：

```txt
apps/vue-*/**/*.vue
packages/vue/**/*.vue
```

因此 `.ts` 文件没有被遗漏，只是无需使用 `.vue` 文件解析器。

### `@repo/eslint-config/boundaries`

该配置用于把目录设计转化为可执行约束，当前规则包括：

| 规则                      | 目的                                |
| ------------------------- | ----------------------------------- |
| 禁止 `@repo/*/src/**`     | 必须通过 package exports 使用共享包 |
| 禁止直接导入 `apps/**`    | 应用之间不能形成源码依赖            |
| 禁止 `packages/**/src/**` | 不允许绕过包的公开入口              |
| shared 禁止依赖 React/Vue | 保持框架无关，可被两套模板复用      |
| React 生态禁止依赖 Vue    | 应用及 `packages/react/*` 保持隔离  |
| Vue 生态禁止依赖 React    | 应用及 `packages/vue/*` 保持隔离    |

正确导入：

```ts
import { createRequestClient } from "@repo/request";
import { PermissionGuard } from "@repo/react-auth";
```

错误导入：

```ts
import { createRequestClient } from "@repo/request/src/client";
import { Button } from "../../../packages/react/ui/src";
```

边界规则关注依赖方向，不替代 `package.json` 的依赖声明。新增内部包时仍需在消费方
声明 `workspace:*` 依赖。

## 项目命名约定

框架配置通过目录命名自动匹配：

```txt
apps/react-*
apps/vue-*
packages/react/*
packages/vue/*
```

例如新增 `apps/react-admin` 或 `apps/vue-portal` 后，现有规则会自动生效。如果项目
无法遵循该约定，应在根 `eslint.config.js` 中显式组合配置，不要在共享包中硬编码
某个具体业务项目名称。

## 新增 React 应用

推荐目录名为 `apps/react-<name>`。项目不需要单独的 ESLint 配置，只需确保根配置已
引入 `reactConfig`、`reactAppConfig` 和 `boundaryConfig`。

验证命令：

```bash
pnpm --filter <workspace-name> lint
```

## 新增 Vue 应用

推荐目录名为 `apps/vue-<name>`。`.ts` 与 `.vue` 文件会自动进入 Vue 规则范围，
`.vue` 文件额外使用 Vue SFC 解析器。

验证命令：

```bash
pnpm --filter <workspace-name> lint
```

## 局部覆盖原则

只有某个项目需要的规则，应在根 `eslint.config.js` 增加带 `files` 的局部配置：

```js
{
  files: ["apps/react-admin/src/legacy/**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
}
```

使用局部文件范围能明确兼容规则的影响面。只有当多个同类项目都需要同一规则时，才
考虑将其上移到共享配置。

## 扩展配置的步骤

1. 明确新规则属于基础、环境、框架还是边界。
2. 优先修改对应职责文件，不在根配置堆积通用规则。
3. 新文件需要导出 Flat Config 数组。
4. 在 `package.json#exports` 中增加公开入口。
5. 在根 `eslint.config.js` 中按正确顺序组合。
6. 更新本文档并执行 `pnpm lint`。

## package.json 字段说明

`package.json` 使用严格 JSON，因此不添加注释。字段含义如下：

- `name`：workspace 包名，根配置通过该名称导入。
- `version`：内部包版本，目前不用于发布。
- `private`：禁止误发布到 npm registry。
- `type`：使 `.js` 配置按 ESM 解析。
- `exports`：声明允许消费方使用的稳定入口。
- `dependencies`：配置执行时直接加载的 ESLint 插件与规则包。
- `peerDependencies.eslint`：要求消费仓库提供兼容的 ESLint 9。

入口映射：

```txt
@repo/eslint-config/base       -> base.js
@repo/eslint-config/boundaries -> boundaries.js
@repo/eslint-config/browser    -> browser.js
@repo/eslint-config/naming     -> naming.js
@repo/eslint-config/node       -> node.js
@repo/eslint-config/react      -> react.js
@repo/eslint-config/vue        -> vue.js
```

## 常见问题

### 为什么 Prettier 不在 Vue 或 React 配置中引入

Prettier 冲突处理是整个仓库的统一收尾逻辑。放在根配置末尾可以覆盖所有语言和框架，
也避免每个子配置重复依赖 `eslint-config-prettier`。

### 为什么 shared 包不能依赖 React 或 Vue

`packages/shared` 定位为跨框架基础能力。如果需要框架适配，应分别放入
`packages/react` 或 `packages/vue`，让 shared 保持纯 TypeScript 或 Web API 能力。

### 为什么规则没有匹配新应用

优先检查目录是否符合 `apps/react-*` 或 `apps/vue-*`，再检查文件扩展名是否包含在
对应 `files` 模式中。
根 ESLint 配置会读取 `apps/*/package.json` 的 React/Vue 依赖，动态识别每个应用的
框架。业务应用目录名不需要包含 `react-` 或 `vue-` 前缀，新生成的 `admin-web`、
`portal-web` 等应用仍会获得正确的 Hooks、Vue SFC、Fast Refresh 和框架边界规则。
