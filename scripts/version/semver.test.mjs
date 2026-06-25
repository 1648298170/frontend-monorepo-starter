import { describe, expect, it } from "vitest";

import { bumpSemver, parseSemver } from "./semver.mjs";

// SemVer 测试保护版本命令最核心的计算规则，避免错误升级应用版本。
describe("application SemVer", () => {
  it("bumps patch, minor and major versions", () => {
    expect(bumpSemver("0.1.0", "patch")).toBe("0.1.1");
    expect(bumpSemver("0.1.0", "minor")).toBe("0.2.0");
    expect(bumpSemver("0.1.0", "major")).toBe("1.0.0");
  });

  it("accepts standard prerelease versions and rejects shorthand", () => {
    expect(parseSemver("1.2.3-beta.1")).toMatchObject({
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(() => parseSemver("1.2")).toThrow("不是有效的 SemVer");
  });

  it("rejects numeric prerelease identifiers with leading zeroes", () => {
    expect(() => parseSemver("1.0.0-01")).toThrow("不是有效的 SemVer");
    expect(() => parseSemver("1.0.0-alpha.01")).toThrow("不是有效的 SemVer");
    expect(parseSemver("1.0.0-0")).toMatchObject({
      major: 1,
      minor: 0,
      patch: 0,
    });
  });

  it("bumps integers larger than the JavaScript safe integer range", () => {
    expect(bumpSemver("9007199254740993.0.0", "major")).toBe(
      "9007199254740994.0.0"
    );
    expect(bumpSemver("1.0.9007199254740993", "patch")).toBe(
      "1.0.9007199254740994"
    );
  });
});
