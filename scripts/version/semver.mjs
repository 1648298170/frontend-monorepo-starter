const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

// 校验标准 SemVer，应用版本命令不接受 v1.0.0 或缺少补丁位的简写。
export function parseSemver(version) {
  const match = String(version).match(semverPattern);

  if (!match) {
    throw new Error(`版本 ${version} 不是有效的 SemVer，例如应使用 1.2.3。`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

// major/minor/patch 升级会清除预发布与构建元数据，返回稳定发布版本。
export function bumpSemver(version, bump) {
  const parsed = parseSemver(version);

  if (bump === "major") {
    return `${parsed.major + 1}.0.0`;
  }

  if (bump === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  if (bump === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  throw new Error("--bump 仅支持 major、minor 或 patch。");
}
