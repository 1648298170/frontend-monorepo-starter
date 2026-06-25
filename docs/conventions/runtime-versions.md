# Node.js 与包管理器版本规范

## 版本基线

本仓库统一使用以下开发工具链：

| 工具    | 版本要求       | 用途                                            |
| ------- | -------------- | ----------------------------------------------- |
| Node.js | `>=22.12.0`    | 本地开发、构建、测试及脚本运行                  |
| pnpm    | `10.18.3`      | 唯一允许使用的依赖安装与 Workspace 管理工具     |
| npm     | `>=10.9.0 <11` | 随 Node.js 提供的基础工具链，不用于安装项目依赖 |

仓库声明 Node.js 至少为 `22.12.0`，与 Vite 8 和 Knip 6 的实际运行要求保持一致。
`.nvmrc` 和 `.node-version` 继续提供团队推荐的精确版本 `22.22.2`。
pnpm 使用精确版本，保证不同开发者和 CI 生成一致的依赖树及锁文件行为。

## 约束层级

### package.json

根目录 `package.json` 通过以下字段声明版本：

- `packageManager`：固定 pnpm 精确版本，并供 Corepack 识别。
- `engines.node`：声明仓库接受 Node.js `22.12.0` 及更高版本。
- `engines.pnpm`：限制 pnpm 精确版本。
- `engines.npm`：限制 npm 主版本范围。

所有应用和公共包继承根工具链约束，不在子包重复声明。

### 版本文件

- `.nvmrc`：供 nvm、nvm-windows 等版本管理工具读取。
- `.node-version`：供 fnm、Volta、asdf 等兼容工具读取。

两个文件都固定到团队推荐的 Node.js 精确版本。

### 安装检查

`.npmrc` 开启引擎和包管理器严格检查。根目录的 `preinstall` 会执行
`scripts/check-runtime-versions.mjs`，检查 Node.js、pnpm 和 npm，并拒绝使用
npm 或 yarn 安装依赖。

开发者也可以主动执行：

```bash
pnpm check:runtime
```

## 初始化环境

推荐启用 Corepack，让 `packageManager` 字段自动提供正确的 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@10.18.3 --activate
pnpm install
```

使用 nvm-windows 时，可以先安装并切换 Node.js：

```bash
nvm install 22.22.2
nvm use 22.22.2
corepack enable
pnpm install
```

## CI 约束

未来实现 GitLab CI 时，建议使用 Node.js `22.22.2` 镜像，并通过 Corepack
启用 `packageManager` 声明的 pnpm 版本。CI 安装命令统一为：

```bash
pnpm install --frozen-lockfile
```

CI 不应单独维护另一份 pnpm 版本号，避免与 `package.json` 漂移。

## 升级流程

升级 Node.js 或 pnpm 时，需要在同一个变更中完成：

1. 修改根目录 `package.json` 的 `packageManager` 和 `engines`。
2. 同步修改 `.nvmrc` 与 `.node-version`。
3. 更新本文档中的版本基线和初始化命令。
4. 执行 `corepack prepare` 切换 pnpm。
5. 执行 `pnpm install` 更新锁文件。
6. 依次执行 `pnpm check:runtime`、`pnpm lint`、`pnpm typecheck`、`pnpm test` 和
   `pnpm build`。

Node.js 应优先选择处于维护周期内的偶数 LTS 版本。升级前需要确认 Vite、
Vitest、Turbo 和 ESLint 等核心工具已经支持目标版本。
