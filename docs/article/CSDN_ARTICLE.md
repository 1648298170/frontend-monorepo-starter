# 别再复制粘贴了！这个开源 Monorepo 模板，让 Vue 和 React 在一个仓库里优雅共存

> **本文导读**
>
> - 📦 **主角**：开源项目 Frontend Monorepo Starter（一套仓库同时跑 Vue 3 + React 19）
> - 📖 **你将看到**：架构设计思想、5 分钟上手教程、代码生成器与一键发布实战
> - ⭐ **仓库地址**：[github.com/1648298170/frontend-monorepo-starter](https://github.com/1648298170/frontend-monorepo-starter)
> - ⏱️ **阅读时间**：约 10 分钟

---

## 📋 目录

|  章节  | 内容                             |
| :----: | :------------------------------- |
| **一** | 为什么写这篇文章？4 个扎心场景   |
| **二** | 项目简介：它到底是个啥？         |
| **三** | 架构设计：四层结构，一眼看懂     |
| **四** | 快速上手：5 分钟把项目跑起来     |
| **五** | 亮点功能 ①：代码生成器           |
| **六** | 亮点功能 ②：一键发布 `pnpm ship` |
| **七** | 质量保障：工程化检查全套         |
| **八** | 适合谁用？（以及不适合谁）       |
| **九** | 总结 + 求 Star ⭐                |

---

## 一、为什么写这篇文章？4 个扎心场景

先看下面 4 个场景，数数你中了几条：

|  #  | 场景                                 | 后果                                           |
| :-: | :----------------------------------- | :--------------------------------------------- |
| 1️⃣  | 公司同时有 **Vue 项目和 React 项目** | 两个团队各自为政，工具函数写两遍               |
| 2️⃣  | **新建一个后台项目**                 | 从零搭 ESLint / Prettier / TS 配置，一天就没了 |
| 3️⃣  | **公共逻辑改了个 bug**               | 跑到三四个仓库分别改、分别发                   |
| 4️⃣  | **新同事入职**                       | "代码该放哪"靠口口相传，一周才能上手           |

只要中了任意一条，这篇文章就值得你读完。

因为上面 4 个问题，**Frontend Monorepo Starter** 这个开源模板全部给出了解决方案。

> 🔗 项目地址：**https://github.com/1648298170/frontend-monorepo-starter**

---

## 二、项目简介：它到底是个啥？

### 2.1 一句话定位

> 一个**面向真实业务项目**的前端 Monorepo 模板。
>
> 不是玩具，不是 demo 合集，是可以直接拿来开业务的架子。

### 2.2 三大设计目标

|       目标        | 说明                                                         |
| :---------------: | :----------------------------------------------------------- |
| 🎯 **双框架共存** | 同一仓库同时支持 Vue 3 和 React 19 业务应用                  |
|  📦 **能力沉淀**  | 可复用逻辑统一放 `packages`，告别复制粘贴                    |
|  🛠️ **规范统一**  | TypeScript / ESLint / Prettier / 测试 / 构建，全仓库一套标准 |

### 2.3 技术栈一览

|   分类   | 技术                                           |
| :------: | :--------------------------------------------- |
|  包管理  | pnpm workspace（catalog 统一版本）             |
| 任务编排 | Turborepo                                      |
| 构建工具 | **Vite 8 + Rolldown**（生产构建不再用 Rollup） |
|  Vue 侧  | Vue 3 + Vue Router + Pinia                     |
| React 侧 | React 19 + React Router + Zustand              |
|   语言   | **TypeScript 6**                               |
|   测试   | Vitest + Testing Library + Playwright          |

> 💡 **划重点**：`Vite 8 + Rolldown + TypeScript 6` 这套组合，目前网上完整可跑的业务级模板几乎没有。这个模板把新版本的坑都帮你踩完了。

---

## 三、架构设计：四层结构，一眼看懂

很多人以为 Monorepo 就是"把一堆项目塞进一个仓库"，最后变成大型垃圾场。

这个模板的核心思想恰恰相反——**用分层把边界画清楚**。

### 3.1 整体目录结构

```txt
frontend-monorepo-starter/
├── apps/                    # 【第 1 层】业务应用层（保持"薄"）
│   ├── vue-web/             #    Vue 业务应用
│   └── react-web/           #    React 业务应用
│
├── packages/
│   ├── shared/              # 【第 2 层】框架无关能力
│   │   ├── auth/            #    权限判断规则
│   │   ├── utils/           #    工具函数
│   │   ├── request/         #    请求封装
│   │   ├── config/          #    运行时配置解析
│   │   └── observability/   #    错误上报契约
│   ├── vue/                 # 【第 3 层】Vue 专属适配
│   ├── react/               # 【第 3 层】React 专属适配
│   └── tooling/             # 【第 4 层】工程规范
│                            #    （共享 tsconfig / eslint-config）
│
├── templates/apps/          # 应用生成模板
├── scripts/                 # 代码生成器 & 校验脚本
└── docs/                    # 30+ 篇架构与规范文档
```

### 3.2 四层职责速查表

|   层   | 位置                                | 职责                      | 一句话记忆         |
| :----: | :---------------------------------- | :------------------------ | :----------------- |
| 应用层 | `apps/*`                            | 路由、页面、业务装配      | 保持薄，只装不造   |
| 共享层 | `packages/shared/*`                 | 纯逻辑，不碰任何框架      | 谁都能用           |
| 适配层 | `packages/vue/*` `packages/react/*` | 各框架的组件、Hook、Guard | 各管各的           |
| 规范层 | `packages/tooling/*`                | 共享 TS / ESLint 配置     | 一处修改，全仓生效 |

### 3.3 为什么要拆出 shared 和框架适配层？

用一个例子讲明白——**权限控制**：

- "用户有没有 `order:export` 权限" → 这是**纯逻辑**，与框架无关 → 放 `@repo/auth`
- Vue 的权限 Provider / 路由守卫 → 依赖 Vue → 放 `@repo/vue-auth`
- React 的权限 Provider / Guard → 依赖 React → 放 `@repo/react-auth`

结果就是：**两个技术栈共享同一套业务底层，但框架代码独立演进、互不牵制**。

改一条权限规则，两个应用同时生效——这才是 Monorepo 的真正价值。

### 3.4 新代码放哪里？"5 问定位法"

按顺序自问，命中即停：

```txt
① 只属于某个页面？          → apps/*/src/pages/<page>
② 是完整业务能力？          → apps/*/src/features/<feature>
③ 只在当前应用内复用？      → 当前应用的 components / hooks
④ 跨应用且不依赖框架？      → packages/shared/*
⑤ 跨应用但依赖框架？        → packages/vue/* 或 packages/react/*
```

### 3.5 包边界铁律：只走正门

每个包只能通过 `src/index.ts` 暴露公共 API：

```ts
// ✅ 正确：走公共入口
import { formatDate } from "@repo/utils";

// ❌ 错误：伸手进别人家里翻柜子
import { formatDate } from "@repo/utils/src/date";
```

> 💡 就这一条约定，让每个包的内部结构可以随意重构，调用方毫无感知。

---

## 四、快速上手：5 分钟把项目跑起来

### Step 1：环境准备

|  工具   | 版本要求                        |
| :-----: | :------------------------------ |
| Node.js | `>= 22.12.0`                    |
|  pnpm   | `10.18.3`（唯一允许的包管理器） |

一行命令激活 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.18.3 --activate
```

### Step 2：克隆并安装

```bash
git clone https://github.com/1648298170/frontend-monorepo-starter.git
cd frontend-monorepo-starter

pnpm install
```

> ⚠️ 注意：仓库强制只允许 pnpm，用 npm / yarn 会在 `preinstall` 阶段直接拦截。

### Step 3：启动应用

```bash
pnpm dev          # 同时启动 Vue + React
```

启动成功后访问：

| 应用  | 地址                  |
| :---: | :-------------------- |
|  Vue  | http://localhost:5173 |
| React | http://localhost:5174 |

只想跑一个？也有对应命令：

```bash
pnpm dev:vue      # 只启动 Vue
pnpm dev:react    # 只启动 React
```

> 💡 模板内置 `pnpm check:runtime` 版本检查，环境不对会在安装前拦截，从源头避免"我本地好好的"经典甩锅现场。

---

## 五、亮点功能 ①：代码生成器

手写样板代码？不存在的。这是我个人最喜欢的功能。

### 5.1 生成一个全新的业务应用

```bash
# 第一步：--dry-run 预览变更计划（不实际写入）
pnpm g app --name admin-web --framework react --dry-run

# 第二步：确认无误后真实生成
pnpm g app --name admin-web --framework react

# 第三步：安装依赖并启动
pnpm install
pnpm dev:app admin-web
```

一条命令，一个完整的 React 应用就位：Vite 配置、ESLint、TS 配置、路由、状态库、错误边界、请求客户端单例……**全部自动配好，且严格遵循模板架构**。

### 5.2 日常开发：生成业务模块

| 需求                         | 命令                                                                                            |
| :--------------------------- | :---------------------------------------------------------------------------------------------- |
| 生成 Feature（业务能力单元） | `pnpm g feature --app react-web --name account-center`                                          |
| 生成页面                     | `pnpm g page --app vue-web --name account-center`                                               |
| 生成组件                     | `pnpm g component --app react-web --scope feature --feature account-center --name profile-form` |
| 生成状态管理                 | `pnpm g store --app react-web --name user-session`                                              |
| 生成 React Hook              | `pnpm g hook --app react-web --name pagination`                                                 |
| 生成 Vue Composable          | `pnpm g composable --app vue-web --name pagination`                                             |

### 5.3 三个贴心设计

|     设计      | 说明                                                 |
| :-----------: | :--------------------------------------------------- |
| 🧪 默认带测试 | 生成器自动创建测试文件，想跳过得显式加 `--skip-test` |
|  🛡️ 拒绝覆盖  | 目标文件已存在时直接报错，防止手滑删业务代码         |
|  👀 先看后做  | 所有命令都支持 `--dry-run`，先预览变更计划再执行     |

> ⚠️ 注意：生成 Page **不会**自动注册路由。路由的路径、权限、布局属于业务决策，模板刻意把这个决定权留给你——这是设计哲学，不是缺陷。

---

## 六、亮点功能 ②：一键发布 `pnpm ship`

大多数模板到"构建"就结束了，这个模板把**发布链路**也封装了。

### 6.1 使用步骤

```bash
# 第 0 步（仅首次）：复制示例配置，填入真实服务器信息
cp deploy.config.example.json deploy.config.json

# 发布 vue-web 到 test 环境
pnpm ship vue-web test

# 发布前先演练一遍，不实际执行
pnpm ship react-web production --dry-run

# 线上出问题？交互式回滚
pnpm ship vue-web production --rollback
```

### 6.2 完整发布链路

```txt
pnpm ship  →  构建  →  打包  →  上传服务器  →  原子切换  →  ✅ 完成
                                              ↓
                                     出问题？--rollback 一键回退
```

### 6.3 两个关键词

|    关键词    | 意义                                                       |
| :----------: | :--------------------------------------------------------- |
| **原子切换** | 新版本完全就绪后才切换流量，不会出现"发布中途网站半死不活" |
| **支持回滚** | 线上炸了一键回到上个版本，凌晨三点不用手动翻备份           |

> 💡 对个人项目和小团队来说，这一条命令顶半个 CI/CD。

---

## 七、质量保障：工程化检查全套

### 7.1 常用检查命令

| 命令               | 作用                                  |
| :----------------- | :------------------------------------ |
| `pnpm lint`        | 命名规范 + ESLint + Stylelint         |
| `pnpm typecheck`   | 全仓库 TypeScript 类型检查            |
| `pnpm test`        | 单元测试（Vitest）                    |
| `pnpm test:e2e`    | E2E 测试（Playwright，自动启动应用）  |
| `pnpm lint:unused` | **Knip** 检查未使用的文件、导出、依赖 |
| `pnpm build`       | 构建两个应用                          |

> 💡 `lint:unused` 值得单独表扬：用 Knip 自动找出"写了但没人引用"的死代码。前端项目最容易堆积这种技术债，这里直接自动化治理。

### 7.2 提交规范

- **Husky + lint-staged**：提交前自动格式化暂存区文件
- **Commitlint**：提交信息强制符合 Conventional Commits

```txt
feat: 增加新业务能力      ← ✅ 通过
fix: 修复缺陷             ← ✅ 通过
update                    ← ❌ 被钩子拦截
```

### 7.3 环境变量约定

```txt
.env              # 通用值
.env.development  # 本地
.env.test         # 测试
.env.uat          # 预发
.env.production   # 生产
.env.local        # 本机覆盖，不提交 Git
```

每套环境都有对应的 `dev:*` 和 `build:*` 命令，告别"改 `.env` 切环境再改回来"的原始操作。

---

## 八、适合谁用？（以及不适合谁）

| ✅ 适合                                  | ❌ 不太适合                           |
| :--------------------------------------- | :------------------------------------ |
| 企业中后台 / 内部工具团队                | 想发布 npm 组件库的（这不是发包模板） |
| 同时维护 Vue + React 项目的团队          | 只有单个超小项目的个人（杀鸡用牛刀）  |
| 想统一工程规范的团队 Leader              |                                       |
| 想学习 Monorepo 架构的开发者             |                                       |
| 想尝鲜 Vite 8 / Rolldown / TS 6 的开发者 |                                       |

> 💡 如果你的团队正在从零搭前端基建，clone 下来改一改就能用，**至少省下 2~3 周时间**。

---

## 九、总结 + 求 Star ⭐

### 9.1 六大亮点回顾

|  #  | 亮点          | 一句话总结                                            |
| :-: | :------------ | :---------------------------------------------------- |
|  1  | 🏗️ 四层架构   | apps 薄、shared 纯、适配独立、规范统一                |
|  2  | ⚡ 技术栈够新 | Vite 8 + Rolldown + TypeScript 6 + React 19 + Vue 3   |
|  3  | 🤖 代码生成器 | 一条命令生成 app / feature / page / component / store |
|  4  | 🚢 一键发布   | `pnpm ship` 构建到上线，支持原子切换和回滚            |
|  5  | 📚 文档完善   | 30+ 篇规范文档 + 新人学习路径 + AI 协作规范           |
|  6  | 🧪 质量内建   | Vitest + Playwright + Knip + Commitlint 全套          |

---

### 🌟 最后，认真求个 Star

这个模板从架构分层到发布脚本，每一处都是按"真实业务项目"的标准打磨的，完全开源免费。

> ### ⭐ 仓库地址
>
> **https://github.com/1648298170/frontend-monorepo-starter**
>
> 点一个 Star 只需要 **1 秒**，但对作者来说是持续更新的最大动力！

也欢迎你：

- 🐛 提 [Issue](https://github.com/1648298170/frontend-monorepo-starter/issues) 反馈问题
- 🔀 提 PR 贡献代码
- 💬 在评论区聊聊你的 Monorepo 实践经验

---

如果这篇文章帮到了你，**点赞 👍 + 收藏 ⭐ + 关注 ➕** 三连走一波~

下期预告：《代码生成器源码解析——如何用 200 行脚本生成规范的 React/Vue 模块》

我们下期见！👋
