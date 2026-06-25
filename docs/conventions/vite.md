# Vite 配置规范

React 与 Vue 应用使用 Vite 8 和 Rolldown。配置遵循“按当前需求启用”的原则，不照搬
其他项目的插件、构建优化和业务约定。

## 当前配置

两套应用共同配置：

- 使用 `loadEnv` 读取应用目录下的环境变量。
- 通过环境变量配置开发服务器 host、port、open 和代理。
- 使用 `strictPort`，端口占用时直接报错。
- 配置 `@` 指向应用的 `src`。
- 使用 Tailwind CSS 4 Vite 插件。
- 自动向 SCSS 注入 `styles/abstracts/index.scss`。
- 使用 Rolldown 手动拆分稳定的框架 vendor chunk。
- React 和 Vue 路由页面均使用动态导入实现页面级拆包。
- 支持按需生成 bundle 分析报告。
- 支持通过环境变量生成 hidden sourcemap。

框架插件分别使用：

- Vue：`@vitejs/plugin-vue`
- React：`@vitejs/plugin-react`

框架分包分别为：

- Vue、Vue Router、Pinia：`vue-vendor`
- React、React DOM、React Router：`react-vendor`

框架运行时更新频率通常低于业务代码，独立 chunk 可以提高浏览器长期缓存命中率，也
为后续按实际体积拆分组件库、图表库和编辑器提供扩展位置。

React Router 使用路由 `lazy` 动态加载页面，Vue Router 使用动态 `import()`。新增
页面时应延续路由级懒加载，避免所有业务页面进入首屏入口。

## 本地代理

公共 `.env` 声明代理前缀：

```env
DEV_PROXY_PREFIX=/api
```

`.env.development` 声明本地后端：

```env
DEV_PROXY_TARGET=http://localhost:3000
```

请求 `/api/users` 时，开发服务器会转发到 `http://localhost:3000/users`。
`DEV_PROXY_TARGET` 未配置时代理关闭，因此 test、UAT 和 production 不会误用本地
代理。

模板中的 `http://localhost:3000` 是占位地址，接入业务时应按实际服务修改。

## Sass 公共能力

Vite 自动向每个 SCSS 编译入口注入：

```scss
@use "@/styles/abstracts/index.scss" as *;
```

`abstracts` 只放变量、函数和 mixin，不应输出实际 CSS，否则每个 Sass 入口都可能重复
生成样式。

## 未集成的参考配置

以下能力目前没有明确需求，因此不加入模板：

- UnoCSS：项目已经使用 Tailwind CSS 4。
- Element Plus 自动导入：模板没有绑定具体 Vue UI 框架。
- Vue API 和组件自动导入：显式 import 更容易搜索和维护。
- SVG Sprite 插件：尚未确定图标资产规范。
- 自定义 `assetsInclude`：Vite 已支持常见字体和静态资源。
- 自定义产物目录和文件名：使用 Vite 默认结构即可。
- 自定义 chunk 警告阈值：使用 Vite 默认值。
- `base: "./"`：应由实际部署路径决定。
- `target: "es2015"`：使用 Vite 8 的现代浏览器默认目标。
- Terser 和删除 console：不增加额外构建依赖，也不无差别删除诊断信息。
- `optimizeDeps.include`：仅在出现依赖预构建问题时添加。

后续只有出现真实问题或明确业务需求时，才增加对应配置。

## 构建分析

构建分析不是日常构建步骤，只在排查依赖体积和分包结果时执行：

```bash
pnpm analyze:react
pnpm analyze:vue
```

命令会设置 `BUILD_ANALYZE=true`，并通过 `rollup-plugin-visualizer` 生成：

```txt
reports/bundle/react.html
reports/bundle/vue.html
```

报告位于仓库级 `reports` 目录，不会进入应用 `dist` 发布产物，也不会自动打开浏览器。

分析报告用于确认：

- 是否存在意外引入的大型依赖。
- 同一依赖是否出现多个版本。
- vendor 分组是否符合缓存边界。
- 某个页面是否把大型功能同步打入首屏。

`reports` 已加入 `.gitignore`，分析报告只作为本地或 CI 临时产物，不提交仓库。

## Sourcemap

公共 `.env` 默认关闭生产 sourcemap：

```env
BUILD_SOURCEMAP=false
```

接入 Sentry 等错误监控平台后，可以通过 CI 环境变量临时开启：

```bash
pnpm build:sourcemap
```

开启后使用 `hidden` sourcemap：构建目录包含 `.map` 文件，但 JavaScript 产物不写入
公开的 sourcemap 引用。流水线应将 `.map` 上传监控平台，并避免随静态资源公开部署。

## 分包扩展原则

当前不把所有 `node_modules` 合并成单个通用 vendor：

- React 应用拆为 `react-core`、`react-router` 和按需生成的
  `react-state`，避免 Router 或状态库升级导致 React 核心缓存同时失效。
- Vue 应用当前体积较小，保留 `vue-vendor`；依赖规模增长后再按相同原则拆分。

后续增加大型依赖时，应根据构建产物和缓存边界增加明确分组，例如：

```txt
ui-vendor
charts-vendor
editor-vendor
```

不要为体积很小或只在单个懒加载页面使用的依赖单独分包，以免增加无效网络请求。
