// 向 barrel 文件追加唯一导出，并保留原有注释、导入和初始化语句的顺序。
export function addExportLine(content, line) {
  const lines = content.split(/\r?\n/);

  if (lines.some((item) => item.trim() === line)) {
    return content.endsWith("\n") ? content : `${content}\n`;
  }

  const normalizedContent = content.trimEnd();

  return normalizedContent ? `${normalizedContent}\n${line}\n` : `${line}\n`;
}

// 向 UI 包增加稳定的组件子路径导出。
export function addPackageExport(content, exportName, entryPath) {
  const packageJson = JSON.parse(content);

  if (packageJson.exports?.[exportName]) {
    throw new Error(`package.json 已存在导出：${exportName}`);
  }

  packageJson.exports ??= {};
  packageJson.exports[exportName] = {
    types: entryPath,
    import: entryPath,
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}
