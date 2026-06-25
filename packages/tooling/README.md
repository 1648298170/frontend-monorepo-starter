# Tooling 工程配置

`packages/tooling` 用于集中维护整个 Monorepo 的工程约束。这里不放业务代码，
而是提供可以被应用和共享包复用的 ESLint、TypeScript 和 Playwright 配置。

## 为什么独立成包

如果每个应用都维护一份 ESLint 和 TypeScript 配置，规则会随着项目增长逐渐分叉：

- Vue、React 应用可能采用不同的基础检查标准。
- 新增共享包时容易遗漏严格模式、模块解析或运行环境类型。
- 修改一条团队规范时需要同步多个项目。
- 应用可能直接导入其他包的内部文件，逐渐形成难以维护的隐式依赖。

因此本项目将稳定、跨项目的规则放在 `packages/tooling`，各项目只保留路径别名、
源码范围、JSX 等与自身有关的局部配置。

## 目录结构

```txt
packages/tooling/
├─ eslint-config/       # ESLint Flat Config、框架规则和依赖边界
│  ├─ base.js
│  ├─ boundaries.js
│  ├─ browser.js
│  ├─ node.js
│  ├─ react.js
│  ├─ vue.js
│  ├─ package.json
│  └─ README.md
├─ tsconfig/            # 可继承的 TypeScript 配置
│  ├─ base.json
│  ├─ browser.json
│  ├─ browser-library.json
│  ├─ library.json
│  ├─ node.json
│  ├─ vite-app.json
│  ├─ package.json
│  └─ README.md
├─ playwright-config/   # 跨应用复用的 Playwright 浏览器、报告和服务策略
│  ├─ src/index.ts
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ README.md
└─ README.md
```

## 配置包的分工

| 配置包                    | 解决的问题                             | 使用位置                    |
| ------------------------- | -------------------------------------- | --------------------------- |
| `@repo/eslint-config`     | 代码质量、框架规范、运行环境和依赖边界 | 根 `eslint.config.js`       |
| `@repo/tsconfig`          | 编译目标、类型严格度、模块与环境类型   | 各项目的 `tsconfig.json`    |
| `@repo/playwright-config` | 浏览器、重试、报告和本地服务策略       | 应用 `playwright.config.ts` |

ESLint 配置在仓库根目录统一组合，使 `pnpm lint` 能检查整个仓库。TypeScript 配置由
每个项目按运行环境选择继承，使 `pnpm typecheck` 可以独立检查各 workspace。

## 设计原则

### 共享稳定规则

跨项目长期一致的配置应放入 tooling，例如：

- TypeScript 严格模式。
- React Hooks、Vue SFC 推荐规则。
- 浏览器与 Node.js 全局变量。
- 应用、框架包和 shared 包之间的依赖方向。

只属于单个应用的规则应留在应用内，例如特殊文件匹配、应用专属全局变量和临时兼容
规则。不要为了一个具体项目修改所有 workspace 的默认行为。

### 按运行环境组合

配置不是按项目名称复制，而是按能力拆分：

- 基础语言能力。
- 浏览器或 Node.js 运行环境。
- React 或 Vue 框架能力。
- 应用和共享包之间的架构边界。

新增项目时组合已有能力即可；只有出现新的通用场景时，才新增 tooling 配置入口。

### 公开入口优先

两个包都通过 `package.json#exports` 暴露稳定入口。消费方应使用：

```js
import { baseConfig } from "@repo/eslint-config/base";
```

或：

```json
{
  "extends": "@repo/tsconfig/vite-app"
}
```

不要通过 `../../packages/tooling/...` 或包内部路径导入配置。公开入口可以隔离目录调整，
也让依赖关系更容易搜索和审查。

### 配置与格式化职责分离

- ESLint 负责代码正确性、框架规则和架构约束。
- TypeScript 负责静态类型与编译环境检查。
- Prettier 负责代码格式。
- Stylelint 负责 CSS、Sass 和 Vue 样式规则。

根 ESLint 配置最后引入 `eslint-config-prettier`，用于关闭与 Prettier 冲突的格式规则。
不要在 ESLint 子配置中重复维护代码排版规则。

## 新项目接入流程

1. 在新 workspace 的 `package.json` 中声明需要的内部配置包。
2. 根据运行环境选择 `@repo/tsconfig` 入口。
3. 确认项目目录符合 ESLint 的框架命名约定。
4. 只在项目 `tsconfig.json` 中添加 `include`、路径别名和 JSX 等局部选项。
5. 运行 `pnpm lint` 和 `pnpm typecheck` 验证接入结果。

React 与 Vue 项目的完整接入示例分别见：

- [ESLint 配置说明](./eslint-config/README.md)
- [TypeScript 配置说明](./tsconfig/README.md)
- [Playwright 配置说明](./playwright-config/README.md)

## 修改配置的维护流程

修改 tooling 时，应先判断变更属于哪一层：

1. 所有 JavaScript、TypeScript 项目都适用：修改基础配置。
2. 只与运行环境有关：修改 browser 或 node 配置。
3. 只与框架有关：修改 react 或 vue 配置。
4. 与包之间的依赖方向有关：修改 boundaries 配置。
5. 只服务单个项目：优先在该项目本地配置中覆盖。

修改完成后至少执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

涉及构建环境、模块解析或输出行为时，还应执行：

```bash
pnpm build
```

## 扩展建议

出现以下情况时，可以新增独立配置入口：

- 增加 Node.js CLI、SSR 或服务端应用。
- 增加测试专用环境，需要 Vitest、Playwright 等全局变量。
- 增加新的前端框架，并且存在独立的官方 ESLint 插件。
- 某类共享包需要不同的 TypeScript lib、类型声明或构建策略。

新增入口时需要同时完成：

1. 创建职责单一的配置文件。
2. 在对应 `package.json#exports` 中公开入口。
3. 在子目录 README 中说明适用范围和使用示例。
4. 在真实项目中接入，避免保留没有消费方的预设配置。
