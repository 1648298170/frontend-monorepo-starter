import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { planGeneration } from "./plan-generation.mjs";
import { applyChanges, validateChanges } from "./transaction.mjs";

const sourceWorkspaceRoot = resolve(import.meta.dirname, "../..");
const temporaryDirectories = [];

// 应用生成测试复制固定模板和最小应用清单，不依赖真实仓库的写入状态。
async function createWorkspace() {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "repo-app-generator-"));
  temporaryDirectories.push(workspaceRoot);
  await cp(
    join(sourceWorkspaceRoot, "templates"),
    join(workspaceRoot, "templates"),
    { recursive: true }
  );
  await createExistingApp(workspaceRoot, "react-web", 5174);
  await createExistingApp(workspaceRoot, "vue-web", 5173);
  return workspaceRoot;
}

// 最小现有应用夹具用于验证包名和端口冲突，不需要复制完整应用源码。
async function createExistingApp(workspaceRoot, appName, port) {
  const appRoot = join(workspaceRoot, "apps", appName);
  await mkdir(appRoot, { recursive: true });
  await writeFile(
    join(appRoot, "package.json"),
    `${JSON.stringify(
      {
        name: `@apps/${appName}`,
        version: "0.1.0",
        private: true,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(join(appRoot, ".env"), `DEV_SERVER_PORT=${port}\n`, "utf8");
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("app generation", () => {
  it("plans a complete React app with automatic port allocation", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await planGeneration({
      workspaceRoot,
      type: "app",
      options: {
        name: "admin-web",
        framework: "react",
        "display-name": "运营管理后台",
        version: "1.2.0",
      },
    });
    const packageChange = result.changes.find(
      ({ relativePath }) => relativePath === "apps/admin-web/package.json"
    );
    const envChange = result.changes.find(
      ({ relativePath }) => relativePath === "apps/admin-web/.env"
    );

    expect(JSON.parse(packageChange.content)).toMatchObject({
      name: "@apps/admin-web",
      version: "1.2.0",
      scripts: {
        "version:patch":
          "node ../../scripts/update-app-version.mjs --bump patch",
        "version:minor":
          "node ../../scripts/update-app-version.mjs --bump minor",
        "version:major":
          "node ../../scripts/update-app-version.mjs --bump major",
        "version:set": "node ../../scripts/update-app-version.mjs --set",
      },
    });
    expect(envChange.content).toContain("DEV_SERVER_PORT=5175");
    expect(envChange.content).toContain("VITE_APP_NAME=运营管理后台");
    expect(result.messages).toContain("端口：5175");
    expect(
      result.changes.some(({ content }) => content.includes("{{APP_NAME}}"))
    ).toBe(false);
  });

  it("plans and writes a Vue app with explicit port", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await planGeneration({
      workspaceRoot,
      type: "app",
      options: {
        name: "portal-web",
        framework: "vue",
        port: "5200",
      },
    });

    await validateChanges(result.changes);
    await applyChanges(result.changes);

    const metadata = JSON.parse(
      await readFile(
        join(workspaceRoot, "apps/portal-web/.template-meta.json"),
        "utf8"
      )
    );
    const packageJson = JSON.parse(
      await readFile(
        join(workspaceRoot, "apps/portal-web/package.json"),
        "utf8"
      )
    );

    expect(metadata).toEqual({
      templateVersion: "1.0.0",
      framework: "vue",
      preset: "standard",
    });
    expect(packageJson.name).toBe("@apps/portal-web");
  });

  it("rejects duplicate applications, ports and invalid versions", async () => {
    const workspaceRoot = await createWorkspace();

    await expect(
      planGeneration({
        workspaceRoot,
        type: "app",
        options: { name: "react-web", framework: "react" },
      })
    ).rejects.toThrow("已存在");
    await expect(
      planGeneration({
        workspaceRoot,
        type: "app",
        options: {
          name: "admin-web",
          framework: "react",
          port: "5173",
        },
      })
    ).rejects.toThrow("端口 5173 已被现有应用使用");
    await expect(
      planGeneration({
        workspaceRoot,
        type: "app",
        options: {
          name: "admin-web",
          framework: "react",
          version: "1.0",
        },
      })
    ).rejects.toThrow("不是有效的 SemVer");
  });

  it("can omit example tests without removing test infrastructure", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await planGeneration({
      workspaceRoot,
      type: "app",
      options: {
        name: "minimal-tests-web",
        framework: "vue",
        "skip-test": true,
      },
    });
    const paths = result.changes.map(({ relativePath }) => relativePath);

    expect(paths.some((path) => path.includes(".test."))).toBe(false);
    expect(paths.some((path) => path.includes(".spec."))).toBe(false);
    expect(paths).toContain("apps/minimal-tests-web/vitest.config.ts");
    expect(paths).toContain("apps/minimal-tests-web/src/test/setup.ts");
    expect(paths).toContain("apps/minimal-tests-web/playwright.config.ts");
  });

  it("allows later generation inside an application with an arbitrary name", async () => {
    const workspaceRoot = await createWorkspace();
    const appResult = await planGeneration({
      workspaceRoot,
      type: "app",
      options: {
        name: "admin-web",
        framework: "react",
      },
    });

    await validateChanges(appResult.changes);
    await applyChanges(appResult.changes);

    const componentResult = await planGeneration({
      workspaceRoot,
      type: "component",
      options: {
        app: "admin-web",
        name: "user-card",
      },
    });

    expect(
      componentResult.changes.map(({ relativePath }) => relativePath)
    ).toContain("apps/admin-web/src/components/user-card/UserCard.tsx");
  });
});
