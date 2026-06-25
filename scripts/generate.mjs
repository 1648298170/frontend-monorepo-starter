import { cwd } from "node:process";

import { getHelpText, parseArguments } from "./generator/arguments.mjs";
import { planGeneration } from "./generator/plan-generation.mjs";
import { applyChanges, validateChanges } from "./generator/transaction.mjs";

// CLI 只负责编排：解析参数、展示变更计划、校验冲突并提交事务。
async function main() {
  if (process.argv.slice(2).includes("--help")) {
    console.log(getHelpText());
    return;
  }

  const { type, options } = parseArguments(process.argv.slice(2));

  if (options.help || type === "help" || !type) {
    console.log(getHelpText());
    return;
  }

  const { changes, messages } = await planGeneration({
    workspaceRoot: cwd(),
    type,
    options,
  });

  console.log("生成计划：");
  for (const change of changes) {
    console.log(`  ${change.kind.toUpperCase()} ${change.relativePath}`);
  }

  await validateChanges(changes);

  if (options["dry-run"]) {
    console.log("\n当前为 dry-run，未写入任何文件。");

    for (const message of messages) {
      console.log(`提示：${message}`);
    }

    return;
  }

  await applyChanges(changes);
  console.log(`\n生成完成，共处理 ${changes.length} 个文件。`);

  for (const message of messages) {
    console.log(`提示：${message}`);
  }
}

main().catch((error) => {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
});
