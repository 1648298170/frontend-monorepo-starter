import { open, readFile, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parseSemver } from "./semver.mjs";

// 使用同目录临时文件再重命名，避免进程中断时留下半写入的 package.json。
export async function updatePackageVersion(packageJsonPath, nextVersion) {
  parseSemver(nextVersion);

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.version = nextVersion;
  const content = `${JSON.stringify(packageJson, null, 2)}\n`;
  const temporaryPath = join(
    dirname(packageJsonPath),
    `.package-version-${process.pid}-${Date.now()}.tmp`
  );
  const handle = await open(temporaryPath, "wx");

  try {
    await handle.writeFile(content, "utf8");
    await handle.close();
    await rename(temporaryPath, packageJsonPath);
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
