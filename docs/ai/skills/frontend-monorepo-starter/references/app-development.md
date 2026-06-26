# 应用开发规范

处理 `apps/react-web`、`apps/vue-web` 或应用模板功能时，先读：

```text
docs/conventions/application-structure.md
docs/conventions/state-and-routing.md
docs/conventions/environment-variables.md
docs/conventions/tailwind.md
docs/conventions/sass.md
docs/conventions/testing.md
docs/conventions/code-comments.md
```

## 应用职责

- 应用负责路由、状态、运行时配置、页面组合、业务请求客户端单例和错误边界装配。
- 共享包负责可复用的纯能力或框架专属组件，不反向依赖应用。
- 页面级目录放在 `src/pages/*`。
- 功能组件放在 `src/features/*`。
- 应用级公共组件放在 `src/components/*`。
- React Hook 放在 `src/hooks/*`。
- Vue Composable 放在 `src/composables/*`。

## React 应用

- 使用 React 19、React Router、Zustand。
- 路由和状态按 `docs/conventions/state-and-routing.md` 规划。
- 新增业务 Hook 优先放 `src/hooks` 或功能目录内。
- React 专属跨应用能力放入 `packages/react/*`。

## Vue 应用

- 使用 Vue 3、Composition API、`<script setup lang="ts">`。
- 使用 Vue Router 和 Pinia。
- 新增 Composable 优先放 `src/composables` 或功能目录内。
- Vue 专属跨应用能力放入 `packages/vue/*`。
- 修改 `.vue` 文件时遵守 Vue SFC 结构：`<script setup>` 在前，`<template>` 在后。

## 样式和 Design Token

- 应用可以使用 `@repo/design-tokens` 的 CSS，也允许自定义命名和样式体系。
- Tailwind 与 Sass 已集成，优先遵守当前应用的写法。
- 不要为了统一而强制所有应用样式都下沉到公共包。

## 应用改动后检查

- 是否需要同步 `templates/apps/react` 或 `templates/apps/vue`。
- 是否需要补组件级单元测试。
- 是否需要补 Playwright 冒烟或关键链路测试。
- 是否需要更新项目指南或相关 conventions。
