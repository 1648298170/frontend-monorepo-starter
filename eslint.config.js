import eslintConfigPrettier from "eslint-config-prettier/flat";
import { baseConfig } from "@repo/eslint-config/base";
import { boundaryConfig } from "@repo/eslint-config/boundaries";
import { browserConfig } from "@repo/eslint-config/browser";
import { namingConfig } from "@repo/eslint-config/naming";
import { nodeConfig } from "@repo/eslint-config/node";
import { reactAppConfig, reactConfig } from "@repo/eslint-config/react";
import { vueConfig } from "@repo/eslint-config/vue";

export default [
  ...baseConfig,
  ...browserConfig,
  ...nodeConfig,
  ...reactConfig,
  ...reactAppConfig,
  ...vueConfig,
  ...namingConfig,
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
