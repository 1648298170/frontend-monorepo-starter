# 发布流程规范

发布体系遵循“版本化发布、可回滚、配置单一来源”的原则：

- 主通道是 `pnpm ship`（本地 Node 管线），兜底通道是 `deploy-shell/`
  （PowerShell + 服务器端 bash），两个通道发布的版本目录结构完全同构、可互相回滚。
- 服务器/账号/路径/构建命令全部读取仓库根 `deploy.config.json`，单一事实来源。
- 所有环境统一走 release 版本化管线：`releases/<版本>/ + current 原子软链`，
  不直接覆盖线上目录。
- 真实部署配置不提交 Git，仓库只保留脱敏模板 `deploy.config.example.json`。

## 环境与分支映射

`local` 仅用于本机开发，不参与部署。可部署环境与分支、构建命令的映射如下：

| 环境         | 期望分支 | 构建命令     | 环境文件          |
| ------------ | -------- | ------------ | ----------------- |
| `test`       | `test`   | `build:test` | `.env.test`       |
| `uat`        | `uat`    | `build:uat`  | `.env.uat`        |
| `production` | `main`   | `build`      | `.env.production` |

分支映射定义在 `scripts/deploy/deploy.mjs` 的 `ENV_BRANCH_MAP`。主通道
（`pnpm ship`）分支不匹配时拒绝部署；兜底通道（`ship.ps1`）只警告不阻断，
便于应急场景。分支模型调整时只需改这一处映射。

## 部署配置

首次使用先复制模板并填入真实服务器信息：

```bash
cp deploy.config.example.json deploy.config.json
```

`deploy.config.json` 已被 `.gitignore` 忽略，不会误提交。模板中的
`192.0.2.10`、`198.51.100.20`、`203.0.113.30` 均为文档保留地址（RFC 5737），
账号 `deploy` 为占位示例，使用时全部替换为真实信息。

每个 `<app>.<env>` 节点的字段：

| 字段         | 说明                                 |
| ------------ | ------------------------------------ |
| `host`       | 服务器 IP 或域名                     |
| `port`       | SSH 端口，数字类型                   |
| `user`       | SSH 账号，建议独立部署账号而非 root  |
| `sshKeyPath` | 私钥路径，支持 `~` 展开              |
| `deployPath` | 服务器上该应用根目录（nginx 静态根） |
| `outDir`     | 本地产物目录，相对仓库根             |
| `buildCmd`   | 应用 `package.json` 中的构建脚本名   |

## 发布管线

`pnpm ship <app> <env>` 的完整流程：

1. **分支校验**：当前 git 分支必须匹配目标环境，否则拒绝部署。
2. **构建**：`pnpm --filter @apps/<app> run <buildCmd>`。
3. **产物冒烟检查**：解析 `index.html` 引用的本地资源（script、stylesheet、
   modulepreload 强校验，favicon 等弱校验），校验文件真实存在且大小写与磁盘
   一致（发布机 Windows 不敏感、线上 Linux 敏感），缺失即阻断，防白屏上线。
4. **打包**：产物压缩为 `dist-<git短sha>.tar.gz` 并生成 sha256 伴随文件。
5. **断点续传上传**：上传到服务器 `<deployPath>/incoming/`，中断重跑只传
   未完成部分。
6. **远端发布**：单次 SSH 在服务器上完成 sha256 校验 → 解压到
   `releases/<时间戳>-<sha>/` → 校验 `index.html` 存在 → `mv -Tf` 原子切换
   `current` 软链。断连后远端脚本仍会执行完。
7. **清理**：远端保留最近 5 个版本（`KEEP_RELEASES`），超出自动清理；
   本地临时包自动删除。

服务器上的目录结构：

```txt
<deployPath>/
├─ incoming/            # 上传暂存区，发布成功后自动清理
├─ releases/            # 历史版本，保留最近 5 个
|  ├─ 20260831-135348-8b5d46e/
|  └─ ...
└─ current -> releases/20260831-135348-8b5d46e   # 原子软链
```

nginx 把站点根指向 `<deployPath>/current`，发布与回滚都只是切换软链，
不搬运文件、不修改 nginx 配置。

## 版本命名与回滚

版本名格式为 `<时间戳 YYYYMMDD-HHMMSS>-<git 短 sha>`，例如
`20260831-135348-8b5d46e`，可以追溯到具体提交。

```bash
pnpm ship vue-web production --rollback              # 交互式选择版本回滚
pnpm ship vue-web production --rollback 20260831-135348-8b5d46e
pnpm ship vue-web production --dry-run               # 演练，不实际执行
```

回滚只切换 `current` 软链，秒级完成，两个发布通道的版本可互相回滚。

## 兜底通道

`pnpm ship` 不可用时（Node 环境异常、密钥认证问题等），使用
`deploy-shell/ship.ps1`：

```powershell
.\deploy-shell\ship.ps1 vue-web production
.\deploy-shell\ship.ps1 vue-web production -Status
.\deploy-shell\ship.ps1 vue-web production -Rollback 20260831-135348-8b5d46e
.\deploy-shell\ship.ps1 vue-web production -DryRun
```

兜底通道的 scp/ssh 为交互式，密钥失效时会正常提示输密码。服务器端需按
[`deploy-shell/README.md`](../deploy-shell/README.md) 第一节一次性铺设
`deploy.sh`。

## 安全约定

- **脱敏**：仓库不出现真实 IP、账号与内部拓扑；示例配置只用 RFC 5737
  文档地址段。新增配置文件时延续该约定。
- **权限收敛**：建议使用独立部署账号，只对 nginx html 根目录有写权限，
  不使用 root 日常发布。
- **不碰 nginx conf**：所有写操作封闭在 `incoming/`、`releases/` 和
  `current` 软链内。
- **fail-closed**：本地与远端双重校验 `index.html` 与资源完整性，校验
  失败即中止并清理，不部署半包。
- **原子切换**：`ln -sfn + mv -Tf` 单次 rename 完成切换，失败时
  `current` 不动。

## 新增应用接入清单

新增 `apps/<name>` 并需要纳入发布时：

1. 应用 `package.json` 提供对应环境的构建脚本（对齐 `build:test`、
   `build:uat`、`build` 命名）。
2. `deploy.config.example.json` 增加 `<name>` 节点（三环境占位配置），
   本地 `deploy.config.json` 同步填入真实信息。
3. `scripts/deploy/config.mjs` 的 `SUPPORTED_APPS` 加入 `<name>`。
4. `deploy-shell/deploy.sh` 的 `APP_DIR` 映射、`deploy-shell/ship.ps1` 的
   `$validApps` 同步加入。
5. 服务器创建 `<deployPath>/{incoming,releases}` 目录，nginx 站点根指向
   `<deployPath>/current`。

## 与其他文档的关系

- SSH 公钥配置、首次部署教学与故障排查见
  [`../guides/ssh-public-key-setup.md`](../guides/ssh-public-key-setup.md)。
- 环境文件与 mode 约定见 [`environment-variables.md`](environment-variables.md)。
- 服务器铺设、手动兜底等运维细节见 [`deploy-shell/README.md`](../deploy-shell/README.md)。
- GitLab CI 接入后可将本管线作为 CI 内执行单元，设计预留见
  [`../ci/gitlab-ci.md`](../ci/gitlab-ci.md)。
