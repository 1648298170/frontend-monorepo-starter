import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const templateVersion = "1.0.0";

// 递归读取固定模板目录，并将每个文件转换为生成器可消费的相对路径和文本内容。
async function readTemplateFiles(templateRoot) {
  const files = [];

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }

      files.push({
        relativePath: relative(templateRoot, path),
        content: await readFile(path, "utf8"),
      });
    }
  }

  await visit(templateRoot);
  return files;
}

// 占位符替换集中在模板边界，避免业务规划代码理解具体文件内容。
function renderTemplate(content, variables) {
  return Object.entries(variables).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    content
  );
}

// 应用 README 是生成结果的一部分，帮助新应用维护者脱离根文档也能完成常用操作。
function createAppReadme({ appName, displayName, framework, port }) {
  const frameworkName = framework === "react" ? "React" : "Vue";

  return `# ${displayName}

该应用由仓库代码生成器创建，包名为 \`@apps/${appName}\`，技术栈为 ${frameworkName} +
Vite 8。

## 常用命令

\`\`\`bash
pnpm --filter @apps/${appName} dev
pnpm --filter @apps/${appName} lint
pnpm --filter @apps/${appName} typecheck
pnpm --filter @apps/${appName} test
pnpm --filter @apps/${appName} test:e2e
pnpm --filter @apps/${appName} build
pnpm --filter @apps/${appName} version:patch
\`\`\`

也可以进入应用目录运行 \`pnpm version:minor\`、\`pnpm version:major\` 或
\`pnpm version:set 1.2.0\`。版本命令只修改当前应用的 \`package.json\`，不会创建 Git
提交或 Tag。

默认开发地址为 \`http://localhost:${port}\`。端口和公共环境变量位于 \`.env\`，本机
覆盖请写入不提交 Git 的 \`.env.local\`。

首次执行 E2E 前在仓库根目录运行 \`pnpm test:e2e:install\` 安装 Chromium。设置
\`E2E_BASE_URL\` 时可以复用同一套用例测试已部署的 test 或 UAT 环境。

## 目录职责

- \`src/app\`：应用装配、路由、全局 Store、运行时服务和错误处理。
- \`src/pages\`：路由页面和页面级组合。
- \`src/features\`：独立业务能力。
- \`src/styles\`：Tailwind、Sass 和应用全局样式。
- \`src/test\`：Vitest 全局测试配置。
- \`e2e\`：Playwright 端到端测试场景。

新增代码需要附带必要中文注释，并在提交前运行 lint、typecheck、test 和 build。
完整项目说明见仓库根目录 \`docs/guides/project-guide.md\`。
`;
}

// 元数据保持确定性，不记录生成时间，便于模板测试和不同机器之间比较结果。
function createTemplateMetadata(framework) {
  return `${JSON.stringify(
    {
      templateVersion,
      framework,
      preset: "standard",
    },
    null,
    2
  )}\n`;
}

// 加载独立应用模板；skipTest 过滤 Vitest 与 Playwright 用例，不改变测试配置和依赖。
export async function loadAppTemplate({
  workspaceRoot,
  appName,
  displayName,
  framework,
  port,
  version,
  skipTest,
}) {
  const templateRoot = join(workspaceRoot, "templates", "apps", framework);
  const variables = {
    APP_NAME: appName,
    DISPLAY_NAME: displayName,
    PORT: port,
    VERSION: version,
  };
  const templateFiles = await readTemplateFiles(templateRoot);
  const files = templateFiles
    .filter(
      ({ relativePath }) =>
        !skipTest || !/\.(?:test|spec)\.(?:ts|tsx)$/.test(relativePath)
    )
    .map(({ relativePath, content }) => ({
      relativePath,
      content: renderTemplate(content, variables),
    }));

  files.push(
    {
      relativePath: ".template-meta.json",
      content: createTemplateMetadata(framework),
    },
    {
      relativePath: "README.md",
      content: createAppReadme({
        appName,
        displayName,
        framework,
        port,
      }),
    }
  );

  return files;
}
