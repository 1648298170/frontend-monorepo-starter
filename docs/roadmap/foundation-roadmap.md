# Monorepo 基建后续阶段路线图

## 1. 文档目的

本文记录第一阶段完成后的后续集成计划，供技术评审、任务拆分和团队排期使用。

路线图不是必须一次性实现的依赖清单。每个阶段都必须由真实业务问题驱动，并在满足前置
条件后独立立项、实施和验收。

## 2. 当前基线

第一阶段已经完成可用于业务项目的 Monorepo 基础能力：

- pnpm Workspace、catalog 和 Turbo 任务编排。
- React 19 与 Vue 3 两套 Vite 8、Rolldown 业务应用模板。
- React Router、Vue Router、Zustand、Pinia 的基础集成。
- Tailwind CSS 4、Sass、Design Token 和 Stylelint。
- ESLint、Prettier、EditorConfig、VS Code 与命名规范。
- 请求客户端、运行时配置、权限、错误处理和可观测性接口。
- Vitest、Testing Library、Playwright、组件测试、脚本测试和双应用 E2E 冒烟。
- Knip、依赖边界、运行时版本限制和提交前检查。
- 应用、组件、Feature、Page、Store、Hook、Composable 代码生成器。
- 应用版本升级命令及 React、Vue 应用模板实建验证。
- 中文架构说明、规范文档和同事上手指南。

第一阶段的目标是建立稳定、可扩展、可维护的开发基线，不追求一次集成所有平台能力。

## 3. 阶段总览

| 阶段     | 核心目标             | 推荐状态       |
| -------- | -------------------- | -------------- |
| 第二阶段 | 建立质量与交付闭环   | 优先规划       |
| 第三阶段 | 提升业务研发效率     | 按痛点实施     |
| 第四阶段 | 加强生产治理能力     | 上线前实施     |
| 第五阶段 | 支撑多团队规模化协作 | 规模增长后实施 |

阶段之间存在依赖关系。通常应先建立质量门禁，再增加代码生成和发布自动化，最后引入平台化
治理，避免工具数量增长快于团队维护能力。

## 4. 第二阶段：质量与交付闭环

### 4.1 GitLab CI

保留现有设计，但暂不创建 `.gitlab-ci.yml`。

实施前必须确认：

- GitLab Runner 使用 Docker、Shell 还是 Kubernetes executor。
- Node.js 基础镜像与内部镜像仓库地址。
- pnpm Store、Turbo 缓存和构建产物的缓存策略。
- Merge Request、默认分支和 Tag 的触发规则。
- test、UAT、production 的部署平台和审批流程。
- CI 中需要注入的变量及其保护、脱敏和审计方式。

首版流水线建议包含：

1. `install`：执行 `pnpm install --frozen-lockfile`。
2. `quality`：执行 lint、格式检查、Knip 和类型检查。
3. `test`：执行脚本测试和 Workspace 测试。
4. `build`：构建 React、Vue 应用并保存各自 `dist`。
5. `template-verify`：模板或生成器变化时执行应用实建验证。

验收标准：

- Merge Request 无法绕过必要质量门禁。
- 缓存失效不会影响正确性。
- React、Vue 应用产物可以独立下载。
- 失败日志能够定位到具体 Workspace 和命令。

### 4.2 Playwright E2E 扩展

Playwright 基础能力已经完成：共享配置、应用独立场景、三浏览器项目、HTML/JUnit 报告、
Trace、截图、失败视频和首页冒烟测试均已落地。

后续只按真实业务补充：

- 登录、退出和未授权跳转。
- 核心业务表单提交。
- 路由懒加载失败后的恢复页面。
- 权限守卫与受限按钮。
- 可复用登录态、租户和测试数据夹具。

继续保持每个应用维护自己的业务场景，共享 tooling 只维护运行策略。非关键页面不为
追求数量增加 E2E。

### 4.3 测试覆盖率门禁

暂不设置全仓统一高百分比。

推荐按风险逐步增加：

- 请求、权限、配置、金额和版本工具设置较高阈值。
- 纯展示组件维持较低阈值。
- 缺陷修复必须增加对应回归测试。
- Merge Request 重点检查新增代码覆盖率，而不是只看全仓总数。

### 4.4 依赖与安全检查

候选能力：

- `pnpm audit` 或公司内部依赖漏洞平台。
- Renovate 自动创建依赖升级 Merge Request。
- License 合规检查。
- Secret scanning。
- 构建产物 SBOM。

这些能力应与公司安全流程对齐，不应在缺少处理责任人的情况下只增加告警。

## 5. 第三阶段：业务研发效率

### 5.1 代码生成器扩展

推荐按实际重复工作增加以下类型：

- API 模块：生成请求函数、类型、错误映射和测试。
- 表单模块：生成 schema、表单组件、提交逻辑和测试骨架。
- 列表页面：生成查询条件、表格、分页和空状态骨架。
- 权限资源：生成权限常量、Guard 示例和测试。
- Package：生成 shared、React 或 Vue Workspace 包。

继续保持以下原则：

- 默认生成测试和中文说明注释。
- 支持 `--dry-run`。
- 拒绝覆盖已有文件。
- 写入失败可回滚。
- 不自动猜测业务路由、权限和菜单。

自动更新路由继续暂缓。路由路径、布局、权限和元信息具有业务语义，当前收益不足以覆盖
误修改风险。

### 5.2 Storybook 或组件工作台

适合在共享 UI 组件数量明显增加后引入。

首版范围：

- `packages/react/ui` 与 `packages/vue/ui` 分别维护组件预览。
- 展示默认、禁用、加载、错误和边界状态。
- 使用 Design Token。
- 不把业务页面复制到 Storybook。

如果团队主要使用应用页面联调，且共享 UI 数量很少，可以继续暂缓。

### 5.3 Mock 与契约开发

候选方案是 MSW，用于浏览器开发和测试共享接口 Mock。

推荐结构：

```txt
apps/<app>/src/mocks/
  handlers/
  fixtures/
  browser.ts
  server.ts
```

Mock 数据应按业务域组织，不应形成单个巨型 JSON 文件。

当后端提供稳定 OpenAPI 时，可以评估生成类型和客户端，但生成代码应放入明确目录，并有
可重复执行的更新命令。

### 5.4 组件视觉回归

仅在共享 UI 稳定且 Storybook 已落地后评估。

候选能力：

- Playwright Screenshot。
- Chromatic 或公司内部视觉对比平台。
- Design Token 变化的关键组件快照。

视觉回归不替代可访问性和交互测试。

## 6. 第四阶段：生产治理

### 6.1 可观测性平台适配

在 `@repo/observability` 现有接口上接入 Sentry 或公司内部平台。

建议补充：

- 应用版本、环境和发布标识。
- Source Map 安全上传。
- 用户与租户信息脱敏。
- Router、请求层和错误上报之间的 Trace ID。
- 采样率和忽略规则。

Source Map 不应作为公开静态资源随应用发布。

### 6.2 Token 刷新与会话治理

实现应用级单例刷新任务，处理并发 401：

- 同一时间只执行一次刷新。
- 其他请求等待同一个刷新结果。
- 刷新成功后重放原请求。
- 刷新失败后清理会话并跳转登录。
- 防止刷新请求自身进入重试循环。

该能力应保持在应用装配层，不让共享请求包直接依赖 Router 或 Store。

### 6.3 安全基线

上线前建议确认：

- CSP、HSTS、Referrer-Policy 和 Permissions-Policy。
- Cookie、Token 和本地存储策略。
- XSS、开放重定向和不安全 HTML 的检查规则。
- 环境变量、日志和错误上下文脱敏。
- 第三方脚本加载与 Subresource Integrity。

安全 Header 通常由网关或部署平台负责，前端仓库记录要求和验证方式。

### 6.4 性能预算

在真实业务页面出现后建立预算：

- 首屏 JavaScript 和 CSS 体积。
- 路由 Chunk 大小。
- Core Web Vitals。
- 请求数量和关键接口耗时。
- React、Vue Vendor 变化趋势。

预算应先记录基线，再设置告警。不要直接复制其他项目的固定阈值。

## 7. 第五阶段：规模化协作

### 7.1 CODEOWNERS 与责任边界

根据目录职责配置：

- `apps/*`：业务团队。
- `packages/shared/*`：公共能力维护者。
- `packages/react/*`、`packages/vue/*`：框架基础能力维护者。
- `packages/tooling/*`、`scripts/*`：工程基建维护者。

共享配置、公共包和生成器变更应要求对应维护者审核。

### 7.2 Affected 任务与远程缓存

当应用和 Package 数量增长、全量任务明显变慢后再实施：

- GitLab Merge Request 只运行受影响任务。
- Turbo Remote Cache。
- 按应用保存构建产物。
- 缓存命中率和失效原因监控。

远程缓存必须避免把敏感环境变量或私有构建产物暴露给无权限项目。

### 7.3 模板版本与迁移机制

当前 `.template-meta.json` 已记录模板版本。后续可增加：

- 模板变更日志。
- 版本兼容矩阵。
- 检查应用是否落后于模板基线的命令。
- 可重复执行的小型迁移脚本。
- 迁移前 dry-run 与变更报告。

不建议通过重新生成应用覆盖旧应用。模板升级应使用小步迁移。

### 7.4 发布与变更记录

业务应用和可发布 Package 应区分处理：

- 应用版本由 `version:app` 管理，可与 Git Tag、发布平台关联。
- 私有 Workspace 包不需要为了内部联调逐个发布。
- 只有需要独立发布到 Registry 的包才评估 Changesets。
- 发布流程需要生成变更日志、Tag 和可追踪构建版本。

在没有独立发包需求前，不集成 Changesets。

### 7.5 架构决策记录

重大决策建议增加 ADR，例如：

- 为什么使用 Tailwind 而不是 UnoCSS。
- 为什么应用模板同时支持 React 和 Vue。
- 为什么路由不自动生成。
- 为什么共享请求包不依赖状态库。
- 何时启用远程缓存或微前端。

ADR 只记录重要且长期有效的决策，不记录普通代码修改。

## 8. 按需能力池

以下能力不放入固定阶段，出现明确业务需求后单独评估：

- 国际化与多语言资源管理。
- PWA、离线缓存和安装能力。
- SSR、SSG 或服务端 BFF。
- 地图、图表、富文本、低代码等重型业务组件。
- OpenAPI、GraphQL 或 RPC 客户端生成。
- 多品牌主题和白标能力。
- 无障碍自动扫描。

引入前需要回答：

1. 当前有哪些真实使用场景？
2. 能否由现有能力解决？
3. 谁负责长期升级和故障处理？
4. React、Vue 是否都需要支持？
5. 对构建体积、开发体验和 CI 时间有什么影响？

### 8.1 qiankun 微前端预留方案

当前架构支持在指定应用中按需集成 qiankun，但不建议把它默认加入 React、Vue 标准业务
模板。

现有架构已经具备以下基础：

- `apps/*` 相互隔离，不允许通过源码导入依赖其他应用。
- 每个应用具有独立路由、状态、运行时服务、环境变量和构建产物。
- 共享 Package 通过稳定公开入口提供编译期能力。
- 应用可以独立生成、启动、测试、构建和管理版本。

这些约束与微前端的独立开发、独立部署和运行时组合原则一致。

#### 适用条件

只有出现以下情况时才建议评估 qiankun：

- 多个团队需要独立开发和发布前端应用。
- 不同业务域具有明确的生命周期和部署边界。
- 单体应用发布相互阻塞，且模块拆分不能解决。
- 需要在一个门户中组合 React、Vue 或不同升级节奏的应用。

如果只是同一团队维护的普通后台系统，应继续使用当前 Monorepo、路由懒加载和 Feature
分层，不要为了技术形式提前引入微前端。

#### 推荐目录

```txt
apps/
  admin-shell/                 # qiankun 主应用
    src/app/
      micro-frontends/
        registry.ts            # 子应用注册信息
        runtime.ts             # qiankun 注册、启动和错误处理
        micro-app.types.ts     # 主应用内部类型
      router/
    src/pages/
      micro-app/
        MicroAppPage.tsx

  order-web/                   # 独立构建和部署的子应用
  customer-web/                # 独立构建和部署的子应用

packages/shared/
  micro-frontend-contracts/    # 多个应用确实共用通信契约时再创建
```

qiankun 依赖只声明在主应用中。版本可以加入 pnpm catalog，但其他应用不应因此自动安装
qiankun。

#### 主应用职责

主应用负责：

- 根据运行时配置生成子应用注册表。
- 注册并启动 qiankun。
- 提供子应用挂载容器。
- 处理加载失败、超时、降级和重试。
- 统一顶层导航、登录会话和全局布局。
- 向子应用传递稳定且最小的通信接口。

推荐把启动逻辑封装为一个应用级深模块：

```ts
export interface MicroFrontendRuntime {
  start(): void;
  stop(): void;
}
```

页面和业务模块只调用该接口，不直接了解 qiankun 注册参数、沙箱选项和错误恢复细节。

主应用应从运行时配置读取子应用地址：

```env
VITE_MICRO_ORDER_ENTRY=http://localhost:5180
VITE_MICRO_CUSTOMER_ENTRY=http://localhost:5181
```

生产环境优先使用可部署后修改的运行时配置，避免仅调整子应用地址就重新构建主应用。

#### 子应用职责

子应用需要同时支持独立运行和 qiankun 生命周期：

```ts
export async function bootstrap() {}

export async function mount(props: MicroAppProps) {
  render(props.container);
}

export async function unmount() {
  dispose();
}
```

React 子应用每次挂载时创建新的 Root，卸载时调用 `root.unmount()`。Vue 子应用每次挂载时
创建新的 App 实例，卸载时调用 `app.unmount()`。

子应用还需要处理：

- Router basename 与主应用 `activeRule` 保持一致。
- 卸载时清理事件监听、订阅、定时器和应用实例。
- 静态资源地址在独立运行和被加载时都正确。
- 开发服务器允许主应用跨域加载资源。
- 部署服务支持 History fallback。
- CSS 不污染主应用和其他子应用。

#### 通信契约

主应用只传递稳定且较小的接口：

```ts
export interface MicroAppProps {
  locale: string;
  tenantId?: string;
  getAccessToken(): Promise<string | undefined>;
  navigate(path: string): void;
}
```

不要跨应用传递：

- Zustand 或 Pinia Store。
- React Context、Vue App 或 Router 实例。
- 请求客户端单例。
- 可变的大型全局状态对象。
- 框架组件实例。

多个应用确实共用事件名称和载荷类型时，再创建
`packages/shared/micro-frontend-contracts`。该包只能包含类型、事件名和纯协议，不依赖
qiankun、React、Vue、Router 或状态库。

#### Vite 8 与 Rolldown 风险

qiankun 的经典接入方式主要围绕 webpack、UMD 输出和运行时 public path。当前应用使用
Vite 8 与 Rolldown，因此子应用接入不能直接视为标准能力。

正式落地前必须先创建最小 POC，验证：

1. React 和 Vue 子应用能否独立运行。
2. 开发环境能否被主应用正确加载。
3. 生产构建产物能否暴露 qiankun 生命周期。
4. JS 沙箱、样式隔离和静态资源路径是否正确。
5. 路由切换、重复挂载、卸载和重新挂载是否稳定。
6. 子应用构建失败或加载失败时主应用能否恢复。
7. Nginx、网关或实际部署平台是否正确支持跨域与 History fallback。

如果需要社区 Vite 适配插件，必须确认它支持当前 Vite 8、Rolldown 和 qiankun 版本，并
通过锁版本和实建测试保护兼容性。

#### 生成器预留

POC 通过后，可以扩展应用生成器 preset：

```bash
pnpm g app \
  --name admin-shell \
  --framework react \
  --preset qiankun-host

pnpm g app \
  --name order-web \
  --framework vue \
  --preset qiankun-micro
```

`standard` 继续作为默认 preset。qiankun preset 不应改变普通业务模板。

生成器可以负责生命周期骨架、目录、类型和测试，但不自动生成业务路由、菜单、权限和
子应用部署地址。

#### 验收标准

qiankun 集成进入正式模板前必须满足：

- 主应用和每个子应用都能独立启动、测试、构建和部署。
- 子应用连续挂载和卸载不会残留 DOM、事件监听或全局状态。
- 主应用刷新任意子应用路由不会返回 404。
- 子应用加载失败时显示可恢复的错误状态。
- 通信接口有类型、版本约束和测试。
- 不存在应用间源码导入和跨应用 Store 共享。
- Playwright 覆盖主应用导航、子应用加载、刷新和失败恢复。
- 模板实建验证同时覆盖 `standard` 与已启用的 qiankun preset。

在这些条件满足前，qiankun 只保留为单个应用的专项集成，不加入第一阶段标准模板。

## 9. 明确暂缓或不推荐

当前不建议直接实施：

- 自动修改业务路由、菜单和权限。
- 同时维护 Tailwind 与 UnoCSS 两套原子 CSS 体系。
- 为替换 Turbo 而无需求引入 Nx。
- 在单体业务规模下提前引入微前端。
- 把所有 Workspace 包发布到 npm Registry。
- 为每个页面强制增加低价值快照或 E2E。
- 在 GitLab Runner 和部署环境未确认前实现 CI。
- 在共享 UI 数量很少时立即引入 Storybook。

暂缓不是永久拒绝。出现明确收益、维护责任和验收标准后可以重新评估。

## 10. 推荐实施顺序

### 近期

1. 确认 GitLab Runner、缓存和部署环境，只完成 CI 设计评审。
2. 为第一个真实业务流程增加 Playwright 冒烟测试。
3. 接入依赖自动升级和安全告警处理流程。
4. 根据实际接口开发体验决定是否引入 MSW。

### 中期

1. 为共享 UI 建立组件工作台。
2. 扩展 API、表单或列表类生成器。
3. 接入生产错误监控和 Trace ID。
4. 建立关键模块覆盖率与性能预算。

### 规模增长后

1. 配置 CODEOWNERS。
2. 实施 affected pipeline 和 Turbo Remote Cache。
3. 建立模板版本检查与迁移机制。
4. 根据独立发包需求决定是否引入 Changesets。

## 11. 阶段验收模板

每个后续阶段都应记录：

```md
## 背景

当前问题、影响范围和现有数据。

## 目标

本阶段必须解决的用户或工程问题。

## 非目标

明确本阶段不处理的内容。

## 方案

目录、命令、配置、依赖边界和迁移方式。

## 风险

兼容性、性能、安全、维护成本和回滚方案。

## 验收

可执行命令、测试场景、文档和负责人。
```

没有明确目标、非目标和验收标准的能力，不应直接加入模板。
