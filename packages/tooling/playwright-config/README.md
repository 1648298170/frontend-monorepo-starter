# Playwright 共享配置

`@repo/playwright-config` 统一维护所有业务应用的 Playwright 基础策略。应用只声明自己的
名称、访问地址、测试目录和报告目录，不复制浏览器、重试、Trace、截图与报告配置。

## 模块接口

```ts
createPlaywrightConfig({
  appName,
  baseURL,
  reportRoot,
});
```

该接口隐藏以下实现：

- Chromium、Firefox、WebKit 三个桌面浏览器项目。
- 本地服务自动启动与复用。
- CI 重试、Worker 和 `test.only` 防护。
- HTML、JUnit、Trace、截图和失败视频。
- 每个应用独立的测试结果与报告目录。

## 应用职责

每个应用保留：

```txt
apps/<app>/
  e2e/
    smoke.spec.ts
  playwright.config.ts
```

业务流程、测试数据和页面夹具属于应用，不应放进 tooling。只有多个应用都稳定需要的
Playwright 运行策略才进入本包。

## 扩展原则

- 新增浏览器或设备：修改 `createBrowserProjects`。
- 新增全仓报告策略：修改 `createPlaywrightConfig`。
- 登录态、租户、业务 Mock：放在具体应用的 `e2e/fixtures`。
- 页面对象按业务域创建，不建立覆盖全部页面的巨型类。
- 不在共享配置中写死应用端口、账号或后端地址。

应用可以读取 `E2E_BASE_URL` 测试已经部署的 test 或 UAT 环境。此时应将
`webServerCommand` 设为 `false`，避免 Playwright 启动本地服务。
