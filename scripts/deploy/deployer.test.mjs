import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// verifyDistAssets 内部用 logger 输出 [SMOKE] 结果，测试里 mock 掉并捕获调用
vi.mock("./logger.mjs", () => ({
  logger: {
    success: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    blank: vi.fn(),
  },
  spinner: { start: vi.fn(), stop: vi.fn(), succeed: vi.fn(), fail: vi.fn() },
}));

import { logger } from "./logger.mjs";
import { verifyDistAssets } from "./deployer.mjs";

/** 构造一个临时产物目录：index.html 内容 + 若干真实资源文件 */
function makeDist(files, html) {
  const dir = mkdtempSync(join(tmpdir(), "smoke-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, content ?? "");
  }
  writeFileSync(join(dir, "index.html"), html);
  return dir;
}

const warnCalls = () => logger.warn.mock.calls.map((c) => c.join(" "));

let tmpDirs = [];

describe("verifyDistAssets 发布前产物冒烟检查", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tmpDirs = [];
  });
  afterEach(() => {
    for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  });

  it("缺少 index.html 时直接抛错", () => {
    const dir = mkdtempSync(join(tmpdir(), "smoke-test-"));
    tmpDirs.push(dir);
    expect(() => verifyDistAssets(dir, "/srv/app")).toThrow("index.html");
  });

  it("域名根部署：/assets/x.js 原样命中，通过且无前缀", () => {
    const dir = makeDist(
      { "assets/app.js": "// app", "assets/style.css": "body{}" },
      `<html><head>
        <link rel="stylesheet" href="/assets/style.css">
      </head><body>
        <script type="module" src="/assets/app.js"></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    const result = verifyDistAssets(dir, "/data/nginx/html/react-web");
    expect(result.total).toBe(2);
    expect(result.basePrefix).toBeNull();
    expect(logger.success).toHaveBeenCalled();
  });

  it("子路径部署：/h5/static/x.js 剥离前缀命中，前缀与 deployPath 末段一致不警告", () => {
    const dir = makeDist(
      { "static/js/main.js": "// main", "static/css/index.css": "body{}" },
      `<html><head>
        <link rel="stylesheet" href=/h5/static/css/index.css>
      </head><body>
        <script src=/h5/static/js/main.js></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    const result = verifyDistAssets(dir, "/data/nginx/html/h5");
    expect(result.total).toBe(2);
    expect(result.basePrefix).toBe("h5");
    // h5 === h5，不应触发前缀不一致警告
    expect(warnCalls().join("\n")).not.toContain("base 前缀");
  });

  it("强校验资源缺失时抛错并列出缺失文件", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><head>
        <link rel="stylesheet" href="/assets/missing.css">
      </head><body>
        <script src="/assets/app.js"></script>
        <script src="/assets/also-gone.js"></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    let message = "";
    try {
      verifyDistAssets(dir, "/srv/app");
    } catch (err) {
      message = err.message;
    }
    expect(message).toContain("[SMOKE]");
    expect(message).toContain("missing.css");
    expect(message).toContain("also-gone.js");
  });

  it("前缀不匹配：剥离命中的首段与 deployPath 末段不同 → 打警告", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><body><script src="/foo/assets/app.js"></script></body></html>`
    );
    tmpDirs.push(dir);
    const result = verifyDistAssets(dir, "/data/nginx/html/vue-web");
    expect(result.basePrefix).toBe("foo");
    expect(warnCalls().join("\n")).toContain("base 前缀");
  });

  it("外链与 data URI 跳过，不参与校验", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><head>
        <link rel="stylesheet" href="https://cdn.example.com/x.css">
        <link rel="manifest" href="//cdn.example.com/manifest.json">
      </head><body>
        <script src="/assets/app.js"></script>
        <img src="data:image/png;base64,xxxx">
      </body></html>`
    );
    tmpDirs.push(dir);
    const result = verifyDistAssets(dir, "/srv/app");
    expect(result.total).toBe(1);
  });

  it("favicon 等弱校验资源缺失只警告，不阻断", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><head>
        <link rel="icon" href="/favicon.ico">
        <link rel="manifest" href="/manifest.webmanifest">
      </head><body>
        <script src="/assets/app.js"></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    expect(() => verifyDistAssets(dir, "/srv/app")).not.toThrow();
    const warns = warnCalls().join("\n");
    expect(warns).toContain("favicon.ico");
    expect(warns).toContain("manifest.webmanifest");
  });

  it("query / hash 后缀剥离后再匹配", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><body><script src="/assets/app.js?v=abc#chunk"></script></body></html>`
    );
    tmpDirs.push(dir);
    expect(() => verifyDistAssets(dir, "/srv/app")).not.toThrow();
  });

  it("data-src 等伪属性不纳入校验（懒加载占位常见）", () => {
    const dir = makeDist(
      { "assets/app.js": "// app" },
      `<html><head>
        <link data-href="/ghost/placeholder.css" rel="preload">
      </head><body>
        <script data-src="/ghost/lazy.js"></script>
        <script src="/assets/app.js"></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    const result = verifyDistAssets(dir, "/srv/app");
    // 只统计真实 src/href，伪属性引用的 ghost 文件不算缺失
    expect(result.total).toBe(1);
    expect(() => verifyDistAssets(dir, "/srv/app")).not.toThrow();
  });

  it("URL 编码的文件名解码后匹配（与 nginx 线上行为一致）", () => {
    const dir = makeDist(
      { "assets/my file.js": "// app", "assets/图标.css": "body{}" },
      `<html><head>
        <link rel="stylesheet" href="/assets/%E5%9B%BE%E6%A0%87.css">
      </head><body>
        <script src="/assets/my%20file.js"></script>
      </body></html>`
    );
    tmpDirs.push(dir);
    expect(() => verifyDistAssets(dir, "/srv/app")).not.toThrow();
  });

  it("引用大小写与磁盘不一致时视为缺失（Windows 本地不敏感，线上 404）", () => {
    // 磁盘目录是大写 Assets，引用是小写 assets —— 本地 existsSync 会放行，线上会 404
    const dir = makeDist(
      { "Assets/app.js": "// app" },
      `<html><body><script src="/assets/app.js"></script></body></html>`
    );
    tmpDirs.push(dir);
    let message = "";
    try {
      verifyDistAssets(dir, "/srv/app");
    } catch (err) {
      message = err.message;
    }
    expect(message).toContain("[SMOKE]");
    expect(message).toContain("assets/app.js");
  });
});
