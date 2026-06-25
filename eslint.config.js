import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import eslintConfigPrettier from "eslint-config-prettier/flat";
import { baseConfig } from "@repo/eslint-config/base";
import {
  boundaryConfig,
  createAppBoundaryConfig,
} from "@repo/eslint-config/boundaries";
import { browserConfig } from "@repo/eslint-config/browser";
import { namingConfig } from "@repo/eslint-config/naming";
import { nodeConfig } from "@repo/eslint-config/node";
import { createReactAppConfig, reactConfig } from "@repo/eslint-config/react";
import { createVueAppConfig, vueConfig } from "@repo/eslint-config/vue";

// 配置文件可能从应用目录执行，所有扫描路径都以配置文件所在的仓库根目录为准。
const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));
// 应用框架由 package.json 依赖识别，业务目录名无需携带 react/vue 前缀。
const appFrameworks = readdirSync(join(workspaceRoot, "apps"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const directory = `apps/${entry.name}`;
    const packageJson = JSON.parse(
      readFileSync(join(workspaceRoot, directory, "package.json"), "utf8")
    );
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return {
      directory,
      framework: dependencies.react
        ? "react"
        : dependencies.vue
          ? "vue"
          : undefined,
    };
  });
const reactAppDirectories = appFrameworks
  .filter(({ framework }) => framework === "react")
  .map(({ directory }) => directory)
  // 固定模板也要接受与生成后应用相同的 React 规则，避免模板问题延迟到生成后才暴露。
  .concat("templates/apps/react");
const vueAppDirectories = appFrameworks
  .filter(({ framework }) => framework === "vue")
  .map(({ directory }) => directory)
  // Vue 模板源码需要 SFC 解析器和 TypeScript parser，提交前直接执行同一套检查。
  .concat("templates/apps/vue");

export default [
  ...baseConfig,
  ...browserConfig,
  ...nodeConfig,
  ...reactConfig,
  ...createReactAppConfig(reactAppDirectories),
  ...vueConfig,
  ...createVueAppConfig(vueAppDirectories),
  ...namingConfig,
  ...boundaryConfig,
  ...createAppBoundaryConfig({
    reactAppDirectories,
    vueAppDirectories,
  }),
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
