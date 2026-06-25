# VS Code 工作区规范

仓库提交 `.vscode` 工作区配置，用于统一代码格式化、ESLint 修复、TypeScript
版本和常用任务。配置只包含团队协作需要的项目规则，不包含主题、字体、快捷键等个人偏好。

基础字符集、换行和缩进规则由仓库根目录 `.editorconfig` 提供，VS Code 会原生读取。

## 推荐扩展

首次打开仓库时，VS Code 会提示安装：

- ESLint：读取根目录 Flat Config，显示规则错误并支持保存修复。
- Prettier：使用仓库中的 `prettier.config.js` 格式化代码。
- Vue - Official：提供 Vue 3、SFC 和 TypeScript 语言支持。

React 和 TypeScript 使用 VS Code 内置语言服务，不需要额外 React 扩展。

## 保存行为

保存文件时执行：

1. Prettier 格式化。
2. ESLint `source.fixAll` 修复。

VS Code 只负责快速反馈，提交前仍会由 Husky 执行 lint-staged、类型检查和测试，
不能用编辑器检查代替仓库命令。

## TypeScript 版本

工作区固定使用：

```txt
node_modules/typescript/lib
```

这样所有成员使用与项目依赖一致的 TypeScript 版本，避免 VS Code 内置版本与命令行
检查结果不一致。

如果右下角出现 TypeScript 版本提示，应选择 **Use Workspace Version**。

## 工作区任务

通过 `Terminal -> Run Task` 可以运行：

- `dev: all`
- `dev: react`
- `dev: vue`
- `check: all`
- `format: check`

`check: all` 依次执行 lint、类型检查、测试和生产构建。

## 文件显示

资源管理器默认排除：

- `.turbo`
- `coverage`

搜索默认额外排除：

- `node_modules`
- `dist`
- `*.tsbuildinfo`

`dist` 在资源管理器中保持可见，方便开发者确认 Vite 构建产物；但搜索时排除，
避免压缩后的 JavaScript 和 CSS 干扰源码检索。`.gitignore` 仍然忽略 `dist`，
构建产物不会提交到 Git。

## 团队约定

- `.vscode/settings.json`、`extensions.json`、`tasks.json` 应提交 Git。
- 不向仓库提交个人主题、字体、窗口布局或本地绝对路径。
- 不使用 VS Code 用户级配置覆盖项目的 Prettier、ESLint 或 TypeScript 版本。
- 修改工作区配置时，需要确保 Windows、macOS 和 Linux 均可使用。
