import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// 事务层不理解具体生成类型，只处理 create/update 两类文件变更。
// 校验创建文件不存在、更新文件存在，所有检查通过后才开始写入。
export async function validateChanges(changes) {
  const targetPaths = new Set();

  for (const change of changes) {
    if (targetPaths.has(change.path)) {
      throw new Error(`生成计划包含重复目标文件：${change.path}`);
    }

    targetPaths.add(change.path);

    try {
      await readFile(change.path);

      if (change.kind === "create") {
        throw new Error(`目标文件已存在，拒绝覆盖：${change.path}`);
      }
    } catch (error) {
      if (error.code === "ENOENT" && change.kind === "update") {
        throw new Error(`需要更新的文件不存在：${change.path}`);
      }

      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

// 按计划写入全部文件，任一步失败时恢复更新文件并删除本次新文件。
export async function applyChanges(changes) {
  // update 保存原内容用于恢复；create 只记录已经成功创建的文件。
  const backups = new Map();
  const createdFiles = [];

  try {
    for (const change of changes) {
      await mkdir(dirname(change.path), { recursive: true });

      if (change.kind === "update") {
        backups.set(change.path, await readFile(change.path, "utf8"));
        await writeFile(change.path, change.content, "utf8");
      } else {
        // wx 只允许创建不存在的文件，消除校验与写入之间的覆盖竞态。
        await writeFile(change.path, change.content, {
          encoding: "utf8",
          flag: "wx",
        });
        createdFiles.push(change.path);
      }
    }
  } catch (error) {
    for (const [path, content] of backups) {
      await writeFile(path, content, "utf8");
    }

    for (const path of createdFiles.reverse()) {
      await rm(path, { force: true });
    }

    throw error;
  }
}
