# @repo/tsconfig

`@repo/tsconfig` 集中维护 Monorepo 的 TypeScript 编译基线。应用和共享包通过
`extends` 选择与运行环境匹配的配置，并只在本地保留路径别名、源码范围和 JSX 等
项目差异。

当前基线版本为 TypeScript `6.0.3`。配置显式声明 TypeScript 6 改变过的默认行为，
避免后续升级或不同工具调用时出现隐式差异。

## 配置继承关系

```txt
base.json
├─ browser.json
│  ├─ vite-app.json
│  └─ browser-library.json
├─ library.json
└─ node.json
```

继承关系表达的是运行环境和使用场景：

- 所有配置都从 `base` 获得严格检查与模块解析基线。
- 浏览器应用和浏览器类库从 `browser` 获得 DOM 类型。
- Vite 应用在浏览器类型之上增加 Vite 与 Node.js 类型。
- 纯 TypeScript 包只使用 ECMAScript 标准库。
- Node.js 项目增加 Node.js 类型。

## 配置入口选择

| 配置              | 适用场景                          | 当前示例                         |
| ----------------- | --------------------------------- | -------------------------------- |
| `base`            | 创建新的底层配置入口              | tooling 内部继承使用             |
| `browser`         | 通用浏览器源码，不区分应用或类库  | 作为中间配置                     |
| `vite-app`        | Vite 驱动的 React、Vue 浏览器应用 | `apps/react-web`、`apps/vue-web` |
| `library`         | 不依赖 DOM 的纯 TypeScript 包     | `auth`、`utils`                  |
| `browser-library` | UI、Fetch、DOM 工具等浏览器共享包 | `config`、`observability`、UI    |
| `node`            | Node.js 脚本、CLI、服务端包       | 后续 Node workspace              |

选择配置时应根据代码实际运行环境，而不是目录位置。例如 `packages/shared/request`
使用 Fetch API，因此继承 `browser-library`；`packages/shared/utils` 不依赖 DOM，
因此继承 `library`。

## 各配置详细说明

### `base.json`

所有 TypeScript 项目的共同基线：

| 选项                           | 作用                                    |
| ------------------------------ | --------------------------------------- |
| `target: ES2022`               | 使用现代 JavaScript 运行时能力          |
| `useDefineForClassFields`      | 类字段遵循标准定义语义                  |
| `module: ESNext`               | 保留 ESM，由 Vite 或其他工具处理模块    |
| `moduleResolution: Bundler`    | 使用适合现代打包器和 exports 的解析方式 |
| `types: []`                    | 禁止依赖自动发现的环境全局类型          |
| `allowImportingTsExtensions`   | 允许显式导入 TypeScript 扩展名          |
| `resolveJsonModule`            | 允许类型安全地导入 JSON                 |
| `isolatedModules`              | 确保文件可以被独立转译                  |
| `noUncheckedSideEffectImports` | 校验 CSS 等副作用导入是否有类型声明     |
| `noEmit`                       | TypeScript 只检查类型，不直接产出文件   |
| `strict`                       | 启用 TypeScript 严格检查                |
| `noUnusedLocals`               | 禁止未使用的局部变量                    |
| `noUnusedParameters`           | 禁止未使用的参数                        |
| `noFallthroughCasesInSwitch`   | 防止 switch 分支意外贯穿                |
| `skipLibCheck`                 | 跳过依赖声明文件检查，提高检查速度      |

`noEmit` 表示当前模板将 TypeScript 用作类型检查器，应用产物由 Vite/Rolldown 生成。
如果未来某个类库需要用 `tsc` 输出 JavaScript 或声明文件，应新增专用 build 配置，
不要直接改变所有项目的基础行为。

`types: []` 是 TypeScript 6 的显式环境隔离策略。浏览器、Vite 和 Node.js 类型由对应
配置入口按需增加，纯 TypeScript 包不会因为根目录安装了 `@types/node` 而意外获得
`process`、`console` 等全局类型。

启用 `noUncheckedSideEffectImports` 后，UI 包中的 CSS 副作用导入必须由包内
`styles.d.ts` 声明。这样拼错样式文件路径时能够在类型检查阶段暴露。

### `browser.json`

继承 `base`，增加：

```json
{
  "lib": ["ES2022", "DOM", "DOM.Iterable"]
}
```

它提供 `window`、`document`、DOM 集合和浏览器 API 类型，适合作为浏览器场景的中间
基线。

### `vite-app.json`

继承 `browser`，增加：

```json
{
  "types": ["vite/client", "node"]
}
```

- `vite/client` 提供 `import.meta.env`、静态资源导入等 Vite 类型。
- `node` 为同一项目纳入检查的 `vite.config.ts` 提供 Node.js 类型。

因此当前 Vite 应用可以用一个 tsconfig 同时检查 `src` 和 `vite.config.ts`。

### `library.json`

继承 `base`，只启用 `ES2022` 标准库，不提供 DOM 或 Node.js 类型。它适用于：

- 通用工具函数。
- 数据转换与领域逻辑。
- 与运行环境无关的配置解析。
- 希望同时被 React、Vue 或 Node.js 消费的纯 TypeScript 代码。

如果这里出现 `window`、`document` 或 `process` 类型错误，通常说明包的环境定位需要
重新判断，而不是应该立即添加全局类型。

### `browser-library.json`

继承 `browser`，适用于依赖浏览器能力但不属于具体应用的包，例如：

- React、Vue UI 组件库。
- 基于 Fetch API 的请求包。
- DOM 工具、Web Storage、浏览器事件封装。

该配置不包含 Vite 客户端类型，避免共享包无意依赖 `import.meta.env` 等应用构建环境。

### `node.json`

继承 `base`，启用 `ES2022` 和 Node.js 类型。适用于：

- CLI。
- Node.js 脚本。
- 服务端包。
- 不由 Vite 应用 tsconfig 覆盖的独立构建配置。

## 当前项目示例

### React Vite 应用

```json
{
  "extends": "@repo/tsconfig/vite-app",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

React 的 JSX 转换方式和应用路径别名属于项目差异，因此留在应用配置中。

### Vue Vite 应用

```json
{
  "extends": "@repo/tsconfig/vite-app",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "vite.config.ts"]
}
```

Vue SFC 必须显式纳入 `include`，类型检查由 `vue-tsc` 执行。

### 纯 TypeScript 共享包

```json
{
  "extends": "@repo/tsconfig/library",
  "include": ["src"]
}
```

适用于 `packages/shared/auth` 和 `packages/shared/utils`。

### 浏览器共享包

```json
{
  "extends": "@repo/tsconfig/browser-library",
  "include": ["src"]
}
```

React UI 需要额外加入 `"jsx": "react-jsx"`，Vue UI 可使用
`"jsx": "preserve"` 并让 `vue-tsc` 检查 `.vue` 文件。

`packages/shared/config` 使用浏览器标准 `URL`，`packages/shared/observability` 提供
浏览器控制台 reporter，因此二者也继承 `browser-library`。

### Node.js 包

```json
{
  "extends": "@repo/tsconfig/node",
  "include": ["src"]
}
```

## 项目本地应该配置什么

建议只保留项目特有内容：

- `include`、`exclude`。
- `paths`，目标路径必须使用 `./` 开头的显式相对路径。
- React/Vue 的 JSX 选项。
- 项目专属类型声明。
- 构建工具要求的局部选项。

以下内容应优先在共享配置维护：

- `strict` 及相关严格检查。
- `target`、`module`、`moduleResolution`。
- 浏览器、Node.js 等通用运行环境。
- 所有项目都应该遵循的安全检查。

## 路径别名说明

TypeScript 的 `paths` 只负责类型解析，不会自动让运行时或打包器识别别名。应用使用
`@/*` 时，还需要确保 Vite 配置中存在对应别名。

TypeScript 6 不再需要通过 `baseUrl` 配合 `paths`。本仓库不使用已弃用的
`baseUrl`，别名目标统一写成 `"./src/*"`。

内部 workspace 包应使用包名和 `package.json#exports`：

```ts
import { formatDate } from "@repo/utils";
```

不要使用 `paths` 将另一个包的 `src` 目录伪装成本地路径，这会绕过包边界和构建契约。

## 新增配置入口

只有现有入口无法准确表达新的通用环境时才新增配置，例如 SSR、测试或需要声明文件
输出的类库。

新增步骤：

1. 选择最接近的父配置并通过 `extends` 继承。
2. 只声明该场景新增或覆盖的选项。
3. 在 `package.json#exports` 中公开入口。
4. 在真实 workspace 中接入验证。
5. 更新本文档的继承图、场景表和示例。

## package.json 字段说明

`package.json` 必须保持严格 JSON，因此字段在此说明：

- `name`：workspace 包名，项目通过 `@repo/tsconfig/*` 继承配置。
- `version`：内部包版本，目前不用于发布。
- `private`：禁止误发布到 npm registry。
- `type`：声明包使用 ESM 语义。
- `exports`：公开允许继承的 TypeScript 配置入口。

入口映射：

```txt
@repo/tsconfig/base            -> base.json
@repo/tsconfig/browser         -> browser.json
@repo/tsconfig/vite-app        -> vite-app.json
@repo/tsconfig/library         -> library.json
@repo/tsconfig/browser-library -> browser-library.json
@repo/tsconfig/node            -> node.json
```

## 常见问题

### 为什么应用不直接继承 `base`

`base` 不包含 DOM、Vite 或 Node.js 类型。应用继承 `vite-app` 可以获得完整且受控的
环境类型，不需要在每个应用重复配置。

### 为什么 `library` 中不能使用 DOM

这是为了明确共享包的运行环境。如果包确实需要浏览器 API，应切换到
`browser-library`；如果只是一小部分代码依赖浏览器，建议拆分为独立浏览器适配包。

### 修改共享配置后如何验证

执行：

```bash
pnpm typecheck
pnpm build
```

`typecheck` 验证所有 workspace 的类型约束，`build` 验证配置没有破坏实际构建流程。
