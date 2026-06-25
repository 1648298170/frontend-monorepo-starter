import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseArguments } from "./arguments.mjs";
import { toPascalCase, toSuffixedPascalCase } from "./names.mjs";
import { planGeneration } from "./plan-generation.mjs";
import { applyChanges, validateChanges } from "./transaction.mjs";

// 每个用例使用独立临时工作区，确保测试不会修改真实仓库。
const temporaryDirectories = [];

// 创建临时工作区并登记清理路径，供规划和事务测试复用。
async function createWorkspace() {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "repo-generator-"));
  temporaryDirectories.push(workspaceRoot);
  // 生成器通过应用依赖识别框架，测试夹具也使用与真实应用一致的最小 package 声明。
  await writeWorkspaceFile(
    workspaceRoot,
    "apps/react-web/package.json",
    `${JSON.stringify(
      {
        name: "@apps/react-web",
        dependencies: {
          react: "catalog:",
        },
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "apps/vue-web/package.json",
    `${JSON.stringify(
      {
        name: "@apps/vue-web",
        dependencies: {
          vue: "catalog:",
        },
      },
      null,
      2
    )}\n`
  );
  return workspaceRoot;
}

// 写入最小夹具文件，用于模拟已存在的 barrel、package.json 或目录阻塞。
async function writeWorkspaceFile(workspaceRoot, path, content = "") {
  const absolutePath = join(workspaceRoot, path);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

// 无论测试成功或失败，都删除本轮创建的临时工作区。
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true }))
  );
});

// 规划测试关注生成路径、导出更新和父目录约束，不直接写入真实项目。
describe("planGeneration", () => {
  it("plans an application component and its barrel export", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await planGeneration({
      workspaceRoot,
      type: "component",
      options: {
        app: "react-web",
        scope: "app",
        name: "app-header",
      },
    });

    expect(result.changes.map((change) => change.relativePath)).toEqual([
      "apps/react-web/src/components/app-header/AppHeader.tsx",
      "apps/react-web/src/components/app-header/index.ts",
      "apps/react-web/src/components/app-header/AppHeader.test.tsx",
      "apps/react-web/src/components/index.ts",
    ]);
    expect(result.changes.every((change) => change.kind === "create")).toBe(
      true
    );
  });

  it("requires an existing page before generating a page component", async () => {
    const workspaceRoot = await createWorkspace();

    await expect(
      planGeneration({
        workspaceRoot,
        type: "component",
        options: {
          app: "vue-web",
          scope: "page",
          page: "order-detail",
          name: "order-summary",
        },
      })
    ).rejects.toThrow("Page order-detail 不存在");
  });

  it("uses a lint-compatible extension for React Hook tests under pages", async () => {
    const workspaceRoot = await createWorkspace();
    await mkdir(join(workspaceRoot, "apps/react-web/src/pages/home"), {
      recursive: true,
    });

    const result = await planGeneration({
      workspaceRoot,
      type: "hook",
      options: {
        app: "react-web",
        scope: "page",
        page: "home",
        name: "page-title",
      },
    });

    expect(result.changes.map((change) => change.relativePath)).toContain(
      "apps/react-web/src/pages/home/hooks/usePageTitle.test.ts"
    );
  });

  it("does not duplicate page and store responsibility suffixes", async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(
      workspaceRoot,
      "apps/react-web/src/app/store/index.ts",
      ""
    );

    const pageResult = await planGeneration({
      workspaceRoot,
      type: "page",
      options: {
        app: "react-web",
        name: "audit-page",
      },
    });
    const storeResult = await planGeneration({
      workspaceRoot,
      type: "store",
      options: {
        app: "react-web",
        name: "user-store",
      },
    });

    expect(pageResult.changes.map((change) => change.relativePath)).toContain(
      "apps/react-web/src/pages/audit-page/AuditPage.tsx"
    );
    expect(storeResult.changes.at(-1).content).toContain(
      'export { useUserStore } from "./user-store.store";'
    );
  });

  it("updates UI package exports while preserving the package entry", async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(
      workspaceRoot,
      "packages/vue/ui/src/components/index.ts",
      'export * from "./metric-card";\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "packages/vue/ui/package.json",
      `${JSON.stringify(
        {
          name: "@repo/vue-ui",
          exports: {
            ".": {
              types: "./src/index.ts",
              import: "./src/index.ts",
            },
          },
        },
        null,
        2
      )}\n`
    );

    const result = await planGeneration({
      workspaceRoot,
      type: "component",
      options: {
        framework: "vue",
        scope: "ui",
        name: "data-table",
        "skip-test": true,
      },
    });
    const packageChange = result.changes.find(
      (change) => change.relativePath === "packages/vue/ui/package.json"
    );
    const packageJson = JSON.parse(packageChange.content);

    expect(packageJson.exports["."]).toBeDefined();
    expect(packageJson.exports["./data-table"]).toEqual({
      types: "./src/components/data-table/index.ts",
      import: "./src/components/data-table/index.ts",
    });
  });

  it("writes a complete plan and refuses to overwrite it a second time", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await planGeneration({
      workspaceRoot,
      type: "hook",
      options: {
        app: "react-web",
        name: "pagination",
      },
    });

    await validateChanges(result.changes);
    await applyChanges(result.changes);

    expect(
      await readFile(
        join(workspaceRoot, "apps/react-web/src/hooks/usePagination.ts"),
        "utf8"
      )
    ).toContain("export function usePagination");
    await expect(validateChanges(result.changes)).rejects.toThrow("拒绝覆盖");
  });

  it("rejects applications whose framework cannot be identified", async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(
      workspaceRoot,
      "apps/unknown-web/package.json",
      `${JSON.stringify(
        {
          name: "@apps/unknown-web",
          dependencies: {},
        },
        null,
        2
      )}\n`
    );

    await expect(
      planGeneration({
        workspaceRoot,
        type: "component",
        options: {
          app: "unknown-web",
          name: "example-card",
        },
      })
    ).rejects.toThrow("无法从应用 unknown-web 的依赖中识别 React 或 Vue 框架");
  });

  it("rejects applications that directly declare both frameworks", async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(
      workspaceRoot,
      "apps/ambiguous-web/package.json",
      `${JSON.stringify(
        {
          name: "@apps/ambiguous-web",
          dependencies: {
            react: "catalog:",
            vue: "catalog:",
          },
        },
        null,
        2
      )}\n`
    );

    await expect(
      planGeneration({
        workspaceRoot,
        type: "component",
        options: {
          app: "ambiguous-web",
          name: "example-card",
        },
      })
    ).rejects.toThrow("同时声明了 React 和 Vue");
  });

  it("rolls back files created before a write failure", async () => {
    const workspaceRoot = await createWorkspace();
    const blockerPath = join(workspaceRoot, "blocker");
    const createdPath = join(workspaceRoot, "created.txt");
    await writeFile(blockerPath, "this path is a file", "utf8");

    await expect(
      applyChanges([
        {
          path: createdPath,
          kind: "create",
          content: "temporary",
        },
        {
          path: join(blockerPath, "nested.txt"),
          kind: "create",
          content: "cannot be written",
        },
      ])
    ).rejects.toThrow();
    await expect(readFile(createdPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not overwrite or remove a file created after validation", async () => {
    const workspaceRoot = await createWorkspace();
    const targetPath = join(workspaceRoot, "race.txt");
    const changes = [
      {
        path: targetPath,
        kind: "create",
        content: "generated content",
      },
    ];

    await validateChanges(changes);
    await writeFile(targetPath, "external content", "utf8");

    await expect(applyChanges(changes)).rejects.toMatchObject({
      code: "EEXIST",
    });
    await expect(readFile(targetPath, "utf8")).resolves.toBe(
      "external content"
    );
  });
});

// 参数与名称测试保护 CLI 的输入边界，避免错误输入生成不可编译文件。
describe("generator arguments and names", () => {
  it("rejects unknown command options", () => {
    expect(() =>
      parseArguments([
        "component",
        "--app",
        "react-web",
        "--name",
        "audit-card",
        "--typo",
        "yes",
      ])
    ).toThrow("不支持参数 --typo");
  });

  it("rejects names that would create invalid identifiers", () => {
    expect(() => toPascalCase("123-card")).toThrow("名称必须以字母开头");
  });

  it("adds responsibility suffixes only once", () => {
    expect(toSuffixedPascalCase("audit-page", "Page")).toBe("AuditPage");
    expect(toSuffixedPascalCase("AuditPage", "Page")).toBe("AuditPage");
    expect(toSuffixedPascalCase("user-store", "Store")).toBe("UserStore");
  });
});
