# 依赖健康检查

仓库使用 Knip 检查未使用文件、导出、依赖和 catalog 条目：

```bash
pnpm lint:unused
```

## 检查范围

Knip 会结合 workspace 的 `package.json`、源码入口、测试配置和构建配置分析：

- 已经不再被入口引用的源码文件。
- 对外导出但仓库内没有使用的符号。
- 声明在 dependencies 或 devDependencies 中但没有使用的依赖。
- pnpm catalog 中没有任何 workspace 使用的版本项。

代码生成器自身也在根工作区的扫描范围内，避免模板函数或生成流程长期积累废弃代码。

## 精确忽略

`knip.json` 只保留少量必要配置：

- `scripts/*.mjs` 作为根工作区代码生成和校验脚本入口。
- 应用 Sass abstracts 目录与 `sass-embedded` 作为 Vite 动态注入能力。
- `templates/apps/**` 是生成器读取的文本模板，不作为根工作区源码执行；模板依赖由
  生成后的应用 `package.json` 声明和检查。

Sass abstracts 通过 `vite.config.ts` 的 `additionalData` 注入，源码不会出现普通 import，
因此需要精确忽略。新增忽略项时必须在配置旁对应到明确的动态加载机制，不能用
`apps/**`、`packages/**` 等宽泛规则掩盖真实问题。

## 处理报告

建议按以下顺序处理：

1. 确认文件或依赖是否确实不再使用。
2. 能删除就删除，不优先增加忽略规则。
3. 如果由框架配置、字符串路径或构建插件动态加载，再添加最小范围忽略。
4. 调整后运行 `pnpm lint:unused`、`pnpm lint`、`pnpm typecheck` 和 `pnpm test`。

Knip 是静态分析工具，报告需要结合构建方式判断；但每个例外都应当可解释、范围明确并
保留在版本库中。
