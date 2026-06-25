import { access, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { addExportLine, addPackageExport } from "./file-updates.mjs";
import {
  componentIndexTemplate,
  reactComponentTemplate,
  reactComponentTestTemplate,
  reactFeatureTemplate,
  reactFeatureTestTemplate,
  reactHookTemplate,
  reactHookTestTemplate,
  reactPageTemplate,
  reactPageTestTemplate,
  reactStoreTemplate,
  reactStoreTestTemplate,
  reactUiComponentTemplate,
  reactUiStyleTemplate,
  reactUiTypesTemplate,
  uiComponentIndexTemplate,
  vueComponentTemplate,
  vueComponentTestTemplate,
  vueComposableTemplate,
  vueComposableTestTemplate,
  vueFeatureTemplate,
  vueFeatureTestTemplate,
  vuePageTemplate,
  vuePageTestTemplate,
  vueStoreTemplate,
  vueStoreTestTemplate,
  vueUiComponentTemplate,
  vueUiTypesTemplate,
} from "./templates.mjs";
import {
  toDisplayName,
  toKebabCase,
  toPascalCase,
  toSuffixedPascalCase,
  toUseName,
} from "./names.mjs";

// 应用名称同时决定模板框架，调用方不需要重复传入 framework。
const appFrameworks = {
  "react-web": "react",
  "vue-web": "vue",
};

// 第一阶段只开放这些稳定生成类型，新增类型需要同步扩展帮助、文档和测试。
const supportedTypes = new Set([
  "component",
  "feature",
  "page",
  "store",
  "hook",
  "composable",
]);

// 将绝对路径包装成统一的变更描述，CLI 和事务层只依赖这一种结构。
function createChange(workspaceRoot, path, kind, content) {
  return {
    path,
    relativePath: relative(workspaceRoot, path).replaceAll("\\", "/"),
    kind,
    content,
  };
}

// 必填参数集中校验，确保各规划函数返回的计划始终完整可执行。
function requireOption(options, name) {
  const value = options[name];

  if (!value || value === true) {
    throw new Error(`缺少必填参数 --${name}。`);
  }

  return value;
}

// 将应用名解析为框架，并在规划文件之前阻止未知应用。
function resolveApp(options) {
  const app = requireOption(options, "app");
  const framework = appFrameworks[app];

  if (!framework) {
    throw new Error(`不支持应用 ${app}，当前仅支持 react-web 和 vue-web。`);
  }

  return { app, framework };
}

// 仅判断路径是否存在；具体业务错误由调用方补充可理解的上下文。
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Feature/Page 子作用域不允许隐式创建父业务模块，防止输错名称后生成孤立目录。
async function requireDirectory(path, label) {
  if (!(await pathExists(path))) {
    throw new Error(`${label}不存在：${path}`);
  }
}

// barrel 可能尚未创建；生成器会创建新入口，已有入口则在保留原内容的前提下更新。
async function planBarrelExport(workspaceRoot, path, exportLine) {
  if (await pathExists(path)) {
    const content = await readFile(path, "utf8");
    return createChange(
      workspaceRoot,
      path,
      "update",
      addExportLine(content, exportLine)
    );
  }

  return createChange(
    workspaceRoot,
    path,
    "create",
    `// 通过目录入口集中暴露公共能力，避免调用方依赖内部文件路径。\n${exportLine}\n`
  );
}

function getScopedDirectory({ workspaceRoot, app, scope, options, leafName }) {
  // app、feature、page 三种作用域共享同一套路径计算规则。
  const sourceRoot = join(workspaceRoot, "apps", app, "src");

  if (scope === "app") {
    return join(sourceRoot, leafName);
  }

  if (scope === "feature") {
    const feature = toKebabCase(requireOption(options, "feature"));
    return join(sourceRoot, "features", feature, leafName);
  }

  if (scope === "page") {
    const page = toKebabCase(requireOption(options, "page"));
    return join(sourceRoot, "pages", page, leafName);
  }

  throw new Error(`作用域 ${scope} 不支持该生成类型。`);
}

// 对 Feature/Page 作用域执行父目录检查；app 作用域允许首次创建目标目录。
async function requireScopedParent({ workspaceRoot, app, scope, options }) {
  if (scope === "feature") {
    const feature = toKebabCase(requireOption(options, "feature"));
    await requireDirectory(
      join(workspaceRoot, "apps", app, "src", "features", feature),
      `Feature ${feature} `
    );
  }

  if (scope === "page") {
    const page = toKebabCase(requireOption(options, "page"));
    await requireDirectory(
      join(workspaceRoot, "apps", app, "src", "pages", page),
      `Page ${page} `
    );
  }
}

// 组件规划同时覆盖应用组件、Feature/Page 私有组件和 Workspace UI 组件。
async function planComponent(workspaceRoot, options) {
  const scope = options.scope ?? "app";
  const name = requireOption(options, "name");
  const kebabName = toKebabCase(name);
  const pascalName = toPascalCase(name);

  if (scope === "ui") {
    // UI 组件属于框架包，需要额外维护组件入口和 package exports。
    const framework = requireOption(options, "framework");

    if (!["react", "vue"].includes(framework)) {
      throw new Error("--framework 仅支持 react 或 vue。");
    }

    const packageRoot = join(workspaceRoot, "packages", framework, "ui");
    const componentRoot = join(packageRoot, "src", "components", kebabName);
    const componentFile =
      framework === "react" ? `${pascalName}.tsx` : `${pascalName}.vue`;
    const changes = [
      createChange(
        workspaceRoot,
        join(componentRoot, componentFile),
        "create",
        framework === "react"
          ? reactUiComponentTemplate({ pascalName, kebabName })
          : vueUiComponentTemplate({ pascalName, kebabName })
      ),
      createChange(
        workspaceRoot,
        join(componentRoot, `${kebabName}.types.ts`),
        "create",
        framework === "react"
          ? reactUiTypesTemplate({ pascalName })
          : vueUiTypesTemplate({ pascalName })
      ),
      createChange(
        workspaceRoot,
        join(componentRoot, `${kebabName}.css`),
        "create",
        reactUiStyleTemplate({ kebabName })
      ),
      createChange(
        workspaceRoot,
        join(componentRoot, "index.ts"),
        "create",
        uiComponentIndexTemplate({ framework, pascalName, kebabName })
      ),
    ];

    if (!options["skip-test"]) {
      // 默认生成测试，只有调用方明确指定 --skip-test 时才省略。
      changes.push(
        createChange(
          workspaceRoot,
          join(
            componentRoot,
            framework === "react"
              ? `${pascalName}.test.tsx`
              : `${pascalName}.test.ts`
          ),
          "create",
          framework === "react"
            ? reactComponentTestTemplate({ pascalName })
            : vueComponentTestTemplate({ pascalName })
        )
      );
    }

    changes.push(
      await planBarrelExport(
        workspaceRoot,
        join(packageRoot, "src", "components", "index.ts"),
        `export * from "./${kebabName}";`
      )
    );

    const packageJsonPath = join(packageRoot, "package.json");
    const packageJsonContent = await readFile(packageJsonPath, "utf8");
    changes.push(
      createChange(
        workspaceRoot,
        packageJsonPath,
        "update",
        addPackageExport(
          packageJsonContent,
          `./${kebabName}`,
          `./src/components/${kebabName}/index.ts`
        )
      )
    );

    return { changes, messages: [] };
  }

  const { app, framework } = resolveApp(options);
  // 应用内组件按作用域生成局部 barrel，不修改应用全局路由或业务入口。
  await requireScopedParent({ workspaceRoot, app, scope, options });
  const componentsRoot = getScopedDirectory({
    workspaceRoot,
    app,
    scope,
    options,
    leafName: "components",
  });
  const componentRoot = join(componentsRoot, kebabName);
  const componentFile =
    framework === "react" ? `${pascalName}.tsx` : `${pascalName}.vue`;
  const changes = [
    createChange(
      workspaceRoot,
      join(componentRoot, componentFile),
      "create",
      framework === "react"
        ? reactComponentTemplate({ pascalName })
        : vueComponentTemplate({ pascalName })
    ),
    createChange(
      workspaceRoot,
      join(componentRoot, "index.ts"),
      "create",
      componentIndexTemplate({ framework, pascalName, kebabName })
    ),
  ];

  if (!options["skip-test"]) {
    changes.push(
      createChange(
        workspaceRoot,
        join(
          componentRoot,
          framework === "react"
            ? `${pascalName}.test.tsx`
            : `${pascalName}.test.ts`
        ),
        "create",
        framework === "react"
          ? reactComponentTestTemplate({ pascalName })
          : vueComponentTestTemplate({ pascalName })
      )
    );
  }

  changes.push(
    await planBarrelExport(
      workspaceRoot,
      join(componentsRoot, "index.ts"),
      `export * from "./${kebabName}";`
    )
  );

  return { changes, messages: [] };
}

// Feature 是独立业务能力入口，首版只创建可运行组件、测试和稳定导出。
async function planFeature(workspaceRoot, options) {
  const { app, framework } = resolveApp(options);
  const name = requireOption(options, "name");
  const kebabName = toKebabCase(name);
  const pascalName = toPascalCase(name);
  const displayName = toDisplayName(name);
  const featureRoot = join(
    workspaceRoot,
    "apps",
    app,
    "src",
    "features",
    kebabName
  );
  const componentFile =
    framework === "react" ? `${pascalName}.tsx` : `${pascalName}.vue`;
  const changes = [
    createChange(
      workspaceRoot,
      join(featureRoot, componentFile),
      "create",
      framework === "react"
        ? reactFeatureTemplate({ pascalName, displayName })
        : vueFeatureTemplate({ pascalName, displayName })
    ),
    createChange(
      workspaceRoot,
      join(featureRoot, "index.ts"),
      "create",
      componentIndexTemplate({ framework, pascalName, kebabName })
    ),
  ];

  if (!options["skip-test"]) {
    changes.push(
      createChange(
        workspaceRoot,
        join(
          featureRoot,
          framework === "react"
            ? `${pascalName}.test.tsx`
            : `${pascalName}.test.ts`
        ),
        "create",
        framework === "react"
          ? reactFeatureTestTemplate({ pascalName, displayName })
          : vueFeatureTestTemplate({ pascalName, displayName })
      )
    );
  }

  return { changes, messages: [] };
}

// Page 只负责页面骨架；路由、权限和布局包含业务语义，因此保持手动注册。
async function planPage(workspaceRoot, options) {
  const { app, framework } = resolveApp(options);
  const name = requireOption(options, "name");
  const kebabName = toKebabCase(name);
  const pageName = toSuffixedPascalCase(name, "Page");
  const displayName = toDisplayName(name);
  const pageRoot = join(workspaceRoot, "apps", app, "src", "pages", kebabName);
  const componentFile =
    framework === "react" ? `${pageName}.tsx` : `${pageName}.vue`;
  const changes = [
    createChange(
      workspaceRoot,
      join(pageRoot, componentFile),
      "create",
      framework === "react"
        ? reactPageTemplate({ pageName, displayName })
        : vuePageTemplate({ pageName, displayName })
    ),
    createChange(
      workspaceRoot,
      join(pageRoot, "index.ts"),
      "create",
      componentIndexTemplate({
        framework,
        pascalName: pageName,
        kebabName,
      })
    ),
  ];

  if (!options["skip-test"]) {
    changes.push(
      createChange(
        workspaceRoot,
        join(
          pageRoot,
          framework === "react" ? `${pageName}.test.tsx` : `${pageName}.test.ts`
        ),
        "create",
        framework === "react"
          ? reactPageTestTemplate({ pageName, displayName })
          : vuePageTestTemplate({ pageName, displayName })
      )
    );
  }

  return {
    changes,
    messages: [
      `页面已生成，但不会自动修改路由。请按需在 apps/${app}/src/app/router/routes 中注册。`,
    ],
  };
}

// Store 根据应用框架生成 Zustand 或 Pinia 实现，并追加到应用 Store 入口。
async function planStore(workspaceRoot, options) {
  const { app, framework } = resolveApp(options);
  const name = requireOption(options, "name");
  const kebabName = toKebabCase(name);
  const storeName = toSuffixedPascalCase(name, "Store");
  // React 状态接口去掉 Store 后缀，生成 UserState 而不是 UserStoreState。
  const stateName = storeName.slice(0, -"Store".length);
  const useStoreName = `use${storeName}`;
  const storeRoot = join(workspaceRoot, "apps", app, "src", "app", "store");
  const changes = [
    createChange(
      workspaceRoot,
      join(storeRoot, `${kebabName}.store.ts`),
      "create",
      framework === "react"
        ? reactStoreTemplate({ pascalName: stateName, useStoreName })
        : vueStoreTemplate({ kebabName, useStoreName })
    ),
  ];

  if (!options["skip-test"]) {
    changes.push(
      createChange(
        workspaceRoot,
        join(storeRoot, `${kebabName}.store.test.ts`),
        "create",
        framework === "react"
          ? reactStoreTestTemplate({ kebabName, useStoreName })
          : vueStoreTestTemplate({ kebabName, useStoreName })
      )
    );
  }

  changes.push(
    await planBarrelExport(
      workspaceRoot,
      join(storeRoot, "index.ts"),
      `export { ${useStoreName} } from "./${kebabName}.store";`
    )
  );

  return { changes, messages: [] };
}

// Hook 与 Composable 共用作用域和 barrel 逻辑，但严格限制到对应框架。
async function planReusableLogic(workspaceRoot, options, type) {
  const { app, framework } = resolveApp(options);

  if (type === "hook" && framework !== "react") {
    throw new Error("hook 只能生成到 React 应用。");
  }

  if (type === "composable" && framework !== "vue") {
    throw new Error("composable 只能生成到 Vue 应用。");
  }

  const scope = options.scope ?? "app";
  await requireScopedParent({ workspaceRoot, app, scope, options });
  const name = requireOption(options, "name");
  const useName = toUseName(name);
  const directoryName = type === "hook" ? "hooks" : "composables";
  const targetRoot = getScopedDirectory({
    workspaceRoot,
    app,
    scope,
    options,
    leafName: directoryName,
  });
  const changes = [
    createChange(
      workspaceRoot,
      join(targetRoot, `${useName}.ts`),
      "create",
      type === "hook"
        ? reactHookTemplate({ useName })
        : vueComposableTemplate({ useName })
    ),
  ];

  if (!options["skip-test"]) {
    changes.push(
      createChange(
        workspaceRoot,
        join(targetRoot, `${useName}.test.ts`),
        "create",
        type === "hook"
          ? reactHookTestTemplate({ useName })
          : vueComposableTestTemplate({ useName })
      )
    );
  }

  changes.push(
    await planBarrelExport(
      workspaceRoot,
      join(targetRoot, "index.ts"),
      `export { ${useName} } from "./${useName}";`
    )
  );

  return { changes, messages: [] };
}

// 规划阶段不写磁盘，便于 dry-run、测试和写入前的完整冲突检查。
export async function planGeneration({ workspaceRoot, type, options = {} }) {
  if (!supportedTypes.has(type)) {
    throw new Error(
      `不支持生成类型 ${type ?? "(空)"}，请使用 component、feature、page、store、hook 或 composable。`
    );
  }

  if (type === "component") {
    return planComponent(workspaceRoot, options);
  }

  if (type === "feature") {
    return planFeature(workspaceRoot, options);
  }

  if (type === "page") {
    return planPage(workspaceRoot, options);
  }

  if (type === "store") {
    return planStore(workspaceRoot, options);
  }

  return planReusableLogic(workspaceRoot, options, type);
}
