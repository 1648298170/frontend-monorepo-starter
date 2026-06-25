# 代码生成器规范

仓库内置非交互式代码生成器，用于统一目录、命名、测试和公开导出。完整命令
`pnpm generate` 与缩写命令 `pnpm g` 完全等价，适合本地开发和后续 CI 脚本调用。

## 设计原则

- 生成前展示完整文件计划。
- 默认生成单元测试，可通过 `--skip-test` 关闭。
- 已有目标文件一律拒绝覆盖。
- 所有校验通过后才开始写入；写入失败时恢复已更新文件并删除本次新文件。
- `--dry-run` 执行全部路径和冲突校验，但不写磁盘。
- 页面生成不自动修改路由，避免工具猜测权限、布局和路由层级。
- Feature 或 Page 内生成子模块时，父目录必须已经存在。
- 名称必须以英文字母开头，可使用 kebab-case、camelCase 或 PascalCase。
- `Page`、`Store` 等职责后缀可以省略；已提供时生成器不会重复追加。
- 未知命令参数会直接报错，避免拼写错误被静默忽略。

查看帮助：

```bash
pnpm g --help
```

## 支持类型

| 类型         | 作用                                                       |
| ------------ | ---------------------------------------------------------- |
| `app`        | 生成完整 React 或 Vue 标准业务应用                         |
| `component`  | 生成应用级、Feature、Page 或共享 UI 组件                   |
| `feature`    | 生成业务 Feature 入口及测试                                |
| `page`       | 生成页面入口及测试，不修改路由                             |
| `store`      | React 生成 Zustand Store，Vue 生成 Pinia Store，并更新入口 |
| `hook`       | 生成 React Hook，可放在应用、Feature 或 Page               |
| `composable` | 生成 Vue Composable，可放在应用、Feature 或 Page           |

## 生成完整应用

生成 React 应用：

```bash
pnpm g app \
  --name admin-web \
  --framework react \
  --display-name "运营管理后台"
```

生成 Vue 应用并指定端口和初始版本：

```bash
pnpm g app \
  --name portal-web \
  --framework vue \
  --display-name "业务门户" \
  --port 5180 \
  --version 1.0.0
```

参数说明：

| 参数             | 必填 | 默认值             | 说明                             |
| ---------------- | ---- | ------------------ | -------------------------------- |
| `--name`         | 是   | 无                 | 应用目录名，使用 kebab-case      |
| `--framework`    | 是   | 无                 | `react` 或 `vue`                 |
| `--display-name` | 否   | 根据应用名自动生成 | HTML title 和 `VITE_APP_NAME`    |
| `--port`         | 否   | 首个未占用端口     | 扫描现有应用，从 5173 开始分配   |
| `--version`      | 否   | `0.1.0`            | 应用 package.json 初始 SemVer    |
| `--preset`       | 否   | `standard`         | 第一阶段仅支持标准业务模板       |
| `--skip-test`    | 否   | `false`            | 不生成示例测试，保留测试基础设施 |
| `--dry-run`      | 否   | `false`            | 只展示文件计划，不写入磁盘       |

标准应用默认包含：

- Vite 8 与 Rolldown 构建配置。
- React Router + Zustand 或 Vue Router + Pinia。
- 应用级运行时配置、请求客户端和错误上报单例。
- 错误边界、路由错误页和首页懒加载。
- Tailwind CSS 4、Sass 和 Design Token。
- Vitest、Testing Library 与 happy-dom。
- local、test、uat、production 环境文件。
- 示例 Feature、页面、Store、Hook 或 Composable。
- 应用 README 和 `.template-meta.json`。

模板固定保存在：

```txt
templates/apps/react/
templates/apps/vue/
```

生成器不会运行时复制 `apps/react-web` 或 `apps/vue-web`，因此示例应用的业务修改不会
意外改变新应用模板。生成完成后执行：

```bash
pnpm install
pnpm dev:app admin-web
```

也可以使用：

```bash
pnpm build:app admin-web
pnpm test:app admin-web
```

生成器会读取目标应用 `package.json` 的直接依赖识别 React 或 Vue，因此 `admin-web`
等自定义名称应用也可以继续生成 component、feature、page、store、hook 或 composable。

框架识别不依赖目录名称，但要求应用满足以下约束：

- 目录 `apps/admin-web` 对应包名 `@apps/admin-web`。
- React 应用直接声明 `react`，Vue 应用直接声明 `vue`。
- 同一应用同时声明 `react` 和 `vue` 时拒绝生成，避免输出错误技术栈文件。
- 缺少有效 `package.json` 或无法识别框架时拒绝生成。

### 更新应用版本

每个应用的 `package.json` 都提供版本升级脚本。在应用目录中可以直接执行：

```bash
cd apps/admin-web
pnpm version:patch
pnpm version:minor
pnpm version:major
pnpm version:set 1.2.0
```

也可以从仓库根目录通过 filter 调用应用自己的脚本：

```bash
pnpm --filter @apps/admin-web version:patch
```

应用内脚本会根据当前工作目录识别应用，不需要重复传入应用名。

仓库根目录继续提供统一入口，适合自动化脚本或批量工具调用。

升级补丁版本：

```bash
pnpm version:app --app admin-web --bump patch
```

升级次版本或主版本：

```bash
pnpm version:app --app admin-web --bump minor
pnpm version:app --app admin-web --bump major
```

指定精确版本：

```bash
pnpm version:app --app admin-web --set 1.2.0
```

预览但不修改：

```bash
pnpm version:app --app admin-web --bump patch --dry-run
```

版本命令只修改目标应用 `package.json`，不会创建 Git commit 或 Tag。

版本必须符合 SemVer 2.0.0。支持稳定版本、预发布版本和构建元数据，例如
`1.2.3`、`1.2.3-beta.1` 和 `1.2.3+build.5`。

不接受 `v1.2.3`、`1.2` 或数字预发布标识带前导零的版本，例如
`1.0.0-01`、`1.0.0-alpha.01`。版本递增使用精确整数计算，不受 JavaScript
安全整数上限影响。

### 验证应用模板

修改 `templates/apps`、应用依赖或共享 ESLint/Vite 配置后，执行：

```bash
pnpm verify:app-templates
```

该命令会临时生成 React/Vue 应用，离线安装依赖并分别运行 lint、typecheck、test 和
build。它还会验证应用版本命令，以及自定义应用名能否继续生成正确框架的组件。

验证结束后会自动删除临时应用并恢复 Workspace。日常单元测试不会自动执行该重型检查。

## 组件作用域

应用公共组件：

```bash
pnpm g component --app react-web --scope app --name app-header
```

产物位于：

```txt
apps/react-web/src/components/app-header/
```

Feature 内组件：

```bash
pnpm g component \
  --app vue-web \
  --scope feature \
  --feature template-overview \
  --name summary-panel
```

产物位于：

```txt
apps/vue-web/src/features/template-overview/components/summary-panel/
```

Page 内组件：

```bash
pnpm g component \
  --app react-web \
  --scope page \
  --page home \
  --name page-toolbar
```

产物位于：

```txt
apps/react-web/src/pages/home/components/page-toolbar/
```

共享 UI 组件：

```bash
pnpm g component --framework vue --scope ui --name data-table
```

共享 UI 生成会同步更新：

- `packages/vue/ui/src/components/index.ts`
- `packages/vue/ui/package.json` 的组件子路径导出

## 业务模块

生成 Feature：

```bash
pnpm g feature --app react-web --name user-management
```

生成 Page：

```bash
pnpm g page --app vue-web --name order-detail
```

Page 命令完成后，需要手动在对应应用的 `src/app/router/routes` 中注册路由。
路由的布局、权限、懒加载策略和元信息属于业务决策，不由生成器代填。

## 状态与复用逻辑

生成应用 Store：

```bash
pnpm g store --app react-web --name user-session
pnpm g store --app vue-web --name user-session
```

生成应用级 Hook 或 Composable：

```bash
pnpm g hook --app react-web --name pagination
pnpm g composable --app vue-web --name pagination
```

生成到已有 Feature 或 Page：

```bash
pnpm g hook \
  --app react-web \
  --scope feature \
  --feature template-overview \
  --name filters

pnpm g composable \
  --app vue-web \
  --scope page \
  --page home \
  --name page-title
```

## 安全选项

仅查看计划：

```bash
pnpm g component \
  --app react-web \
  --scope page \
  --page home \
  --name page-toolbar \
  --dry-run
```

跳过测试文件：

```bash
pnpm g component \
  --framework react \
  --scope ui \
  --name data-table \
  --skip-test
```

`--skip-test` 只适用于非常薄的声明文件或临时探索。业务组件、Store 和复用逻辑默认应
保留测试，避免生成后再补测试时遗漏关键行为。

## 扩展生成器

生成器代码位于 `scripts/generator/`：

- `app-template.mjs`：读取独立应用模板并替换占位符。
- `arguments.mjs`：解析命令行参数并维护帮助信息。
- `names.mjs`：统一 kebab-case、PascalCase 和 `use*` 命名。
- `templates.mjs`：维护 React/Vue 文件模板。
- `plan-generation.mjs`：决定目录、文件和导出更新。
- `file-updates.mjs`：安全更新 barrel 与 package exports。
- `transaction.mjs`：执行写入、冲突校验和失败回滚。

应用版本工具位于 `scripts/version/`，负责 SemVer 校验和 package.json 原子更新。

新增生成类型时，应先扩展规划层测试，再增加模板和 CLI 帮助。不要在模板函数中直接
读写磁盘，保持“规划”和“提交”分离，才能继续支持 dry-run 与事务回滚。
