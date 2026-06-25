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
| `component`  | 生成应用级、Feature、Page 或共享 UI 组件                   |
| `feature`    | 生成业务 Feature 入口及测试                                |
| `page`       | 生成页面入口及测试，不修改路由                             |
| `store`      | React 生成 Zustand Store，Vue 生成 Pinia Store，并更新入口 |
| `hook`       | 生成 React Hook，可放在应用、Feature 或 Page               |
| `composable` | 生成 Vue Composable，可放在应用、Feature 或 Page           |

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

- `arguments.mjs`：解析命令行参数并维护帮助信息。
- `names.mjs`：统一 kebab-case、PascalCase 和 `use*` 命名。
- `templates.mjs`：维护 React/Vue 文件模板。
- `plan-generation.mjs`：决定目录、文件和导出更新。
- `file-updates.mjs`：安全更新 barrel 与 package exports。
- `transaction.mjs`：执行写入、冲突校验和失败回滚。

新增生成类型时，应先扩展规划层测试，再增加模板和 CLI 帮助。不要在模板函数中直接
读写磁盘，保持“规划”和“提交”分离，才能继续支持 dry-run 与事务回滚。
