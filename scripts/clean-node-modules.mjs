import { rm } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

// 从仓库根目录开始扫描，确保无论命令从哪里触发，都只清理当前仓库内的依赖目录。
const workspaceRoot = resolve(import.meta.dirname, "..");

// 这些目录不需要继续深入扫描，能减少误扫和提升清理速度。
const ignoredDirectoryNames = new Set([
  ".git",
  ".turbo",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);

// 递归查找所有 node_modules；命中后直接记录，不再进入其内部扫描。
async function collectNodeModulesDirectories(directory) {
  const nodeModulesDirectories = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const childDirectory = resolve(directory, entry.name);

    if (entry.name === "node_modules") {
      nodeModulesDirectories.push(childDirectory);
      continue;
    }

    if (ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    nodeModulesDirectories.push(
      ...(await collectNodeModulesDirectories(childDirectory))
    );
  }

  return nodeModulesDirectories;
}

// 删除目录时使用 force，避免部分工作区没有 node_modules 时产生无意义失败。
async function removeNodeModulesDirectories(nodeModulesDirectories) {
  for (const nodeModulesDirectory of nodeModulesDirectories) {
    console.log(`删除依赖目录：${nodeModulesDirectory}`);
    await rm(nodeModulesDirectory, {
      force: true,
      recursive: true,
      maxRetries: 3,
      retryDelay: 200,
    });
  }
}

async function main() {
  const nodeModulesDirectories =
    await collectNodeModulesDirectories(workspaceRoot);

  if (nodeModulesDirectories.length === 0) {
    console.log("未发现需要删除的 node_modules。");
    return;
  }

  await removeNodeModulesDirectories(nodeModulesDirectories);
  console.log(`已删除 ${nodeModulesDirectories.length} 个 node_modules。`);
}

main().catch((error) => {
  console.error(`删除 node_modules 失败：${error.message}`);
  process.exitCode = 1;
});
