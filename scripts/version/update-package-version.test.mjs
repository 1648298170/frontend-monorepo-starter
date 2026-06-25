import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { updatePackageVersion } from "./update-package-version.mjs";

// 原子更新测试使用临时目录，确认命令只修改 version 且保留其他 package 字段。
describe("updatePackageVersion", () => {
  it("updates package.json through a temporary file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "repo-version-"));
    const packageJsonPath = join(directory, "package.json");

    try {
      await writeFile(
        packageJsonPath,
        `${JSON.stringify(
          {
            name: "@apps/example-web",
            version: "0.1.0",
            private: true,
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      await updatePackageVersion(packageJsonPath, "0.2.0");

      expect(JSON.parse(await readFile(packageJsonPath, "utf8"))).toEqual({
        name: "@apps/example-web",
        version: "0.2.0",
        private: true,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
