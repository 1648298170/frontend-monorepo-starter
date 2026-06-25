import { join } from "node:path";

import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from "@playwright/test";

// 应用只提供自身名称、访问地址和报告目录，其余稳定策略由共享配置统一维护。
export interface PlaywrightAppConfigOptions {
  appName: string;
  baseURL: string;
  reportRoot: string;
  testDir?: string;
  webServerCommand?: string | false;
  webServerTimeout?: number;
}

// 将应用端口转换为 Playwright 本地访问地址，并在配置阶段阻止无效端口进入测试。
export function createLocalPlaywrightURL(port: string | undefined): string {
  // 环境文件缺少端口时立即给出清晰错误，避免最终表现为难理解的连接失败。
  if (!port) {
    throw new Error("缺少 DEV_SERVER_PORT，无法创建 Playwright 本地访问地址。");
  }

  // 端口必须为 1 到 65535 之间的整数。
  const parsedPort = Number(port);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error(`DEV_SERVER_PORT 不是有效端口：${port}`);
  }

  // 回环地址不受 Vite 对外监听 host 的影响，适合本地和 CI 访问。
  return `http://127.0.0.1:${parsedPort}`;
}

// 统一创建应用级 Playwright 配置，减少新增应用时复制重试、报告和浏览器策略。
export function createPlaywrightConfig(
  options: PlaywrightAppConfigOptions
): PlaywrightTestConfig {
  // CI 环境禁止遗留 test.only，并降低并发以控制共享 Runner 的资源波动。
  const isCI = Boolean(process.env.CI);

  // 返回 Playwright 官方 defineConfig 结果，使应用配置继续获得完整类型提示。
  return defineConfig({
    // 每个应用独立维护业务场景，默认放在应用根目录的 e2e 中。
    testDir: options.testDir ?? "./e2e",
    // 不允许单个用例文件阻塞其他文件，提升本地和 CI 执行效率。
    fullyParallel: true,
    // CI 中出现 test.only 时直接失败，避免误跳过其他回归场景。
    forbidOnly: isCI,
    // CI 对偶发浏览器或网络抖动重试一次，本地失败则立即反馈。
    retries: isCI ? 1 : 0,
    // CI 默认使用两个 Worker，后续可根据 Runner 规格通过 CLI 覆盖。
    workers: isCI ? 2 : undefined,
    // 单个用例的默认上限，防止页面异常时长期挂起。
    timeout: 30_000,
    // 断言单独设置等待上限，兼顾异步页面加载和失败反馈速度。
    expect: {
      timeout: 5_000,
    },
    // 同时输出终端、HTML 和 JUnit 报告，兼顾本地排查与 GitLab 测试报告接入。
    reporter: [
      [isCI ? "line" : "list"],
      [
        "html",
        {
          open: "never",
          outputFolder: join(options.reportRoot, "html"),
        },
      ],
      [
        "junit",
        {
          outputFile: join(options.reportRoot, "junit.xml"),
        },
      ],
    ],
    // 浏览器运行产物统一写入 reports，避免污染应用源码目录。
    outputDir: join(options.reportRoot, "test-results"),
    // 统一所有浏览器项目共享的运行行为。
    use: {
      // 测试通过相对路径访问当前应用，配置不绑定具体环境域名。
      baseURL: options.baseURL,
      // 首次重试时保留 Trace，提供 DOM、请求和操作时间线。
      trace: "on-first-retry",
      // 失败时保留截图，便于 CI 无头执行后定位页面状态。
      screenshot: "only-on-failure",
      // 失败时保留视频，复杂交互问题可直接回放。
      video: "retain-on-failure",
    },
    // 三种桌面浏览器均预留为项目；日常脚本默认只选择 Chromium。
    projects: createBrowserProjects(),
    // Playwright 自动启动当前应用，已有本地服务时允许直接复用。
    webServer:
      options.webServerCommand === false
        ? undefined
        : {
            command: options.webServerCommand ?? "pnpm dev",
            url: options.baseURL,
            reuseExistingServer: !isCI,
            timeout: options.webServerTimeout ?? 120_000,
            stdout: "pipe",
            stderr: "pipe",
          },
    // 报告元数据标识所属应用，多个应用的结果汇总后仍可区分来源。
    metadata: {
      appName: options.appName,
    },
  });
}

// 浏览器项目集中维护，新增移动端或品牌浏览器时只改这一处。
function createBrowserProjects(): NonNullable<
  PlaywrightTestConfig["projects"]
> {
  return [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ];
}
