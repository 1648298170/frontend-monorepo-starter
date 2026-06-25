const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

// 校验标准 SemVer，应用版本命令不接受 v1.0.0 或缺少补丁位的简写。
export function parseSemver(version) {
  const match = String(version).match(semverPattern);

  // SemVer 规定纯数字预发布标识不能包含前导零，例如 01 非法而 0 合法。
  const hasInvalidNumericPrerelease = match?.[4]
    ?.split(".")
    .some((identifier) => /^\d+$/.test(identifier) && /^0\d+/.test(identifier));

  if (!match || hasInvalidNumericPrerelease) {
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
  parseSemver(version);
  const [, major, minor, patch] = String(version).match(semverPattern);

  if (bump === "major") {
    return `${BigInt(major) + 1n}.0.0`;
  }

  if (bump === "minor") {
    return `${major}.${BigInt(minor) + 1n}.0`;
  }

  if (bump === "patch") {
    return `${major}.${minor}.${BigInt(patch) + 1n}`;
  }

  throw new Error("--bump 仅支持 major、minor 或 patch。");
}
