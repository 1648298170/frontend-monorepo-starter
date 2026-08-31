# deploy-shell —— 兜底发布脚本（本地入口 + 服务器端执行）

`pnpm ship`（本地 Node 管线）不可用时的备用发布通道。**发布动作在服务器上执行**
（deploy.sh），本地 ship.ps1 负责：构建 → 打包 → 上传 → ssh 触发服务器脚本。
目录结构与 `pnpm ship` 完全同构（`incoming/ → releases/<版本>/ → current 原子软链`），
两个通道发布的版本可以互相回滚。环境映射、管线流程与安全约定见
[`docs/conventions/deployment.md`](../docs/conventions/deployment.md)。

> 本文中的服务器 IP / 账号均为 `deploy.config.example.json` 里的示例占位值，
> 使用时替换为自己的真实信息。

## 一、一次性铺设（每台服务器做一次）

```powershell
# 本地（PowerShell，仓库根执行）：上传脚本到服务器并赋权
ssh deploy@203.0.113.30 "mkdir -p /data/nginx/deploy-shell"
scp deploy-shell/deploy.sh deploy@203.0.113.30:/data/nginx/deploy-shell/deploy.sh
ssh deploy@203.0.113.30 "chmod +x /data/nginx/deploy-shell/deploy.sh"

# 验证（应列出 2 个 app 与目录映射）
ssh deploy@203.0.113.30 /data/nginx/deploy-shell/deploy.sh list-apps
```

测试/UAT 服务器换成 `deploy.config.json` 里对应环境的账号与 IP
（示例：test 为 `deploy@192.0.2.10`，uat 为 `deploy@198.51.100.20`）。
若某台机器 nginx 根路径不是默认的 `/data/nginx/html`，把脚本装到对应前缀下，
并在 ship.ps1 的 `$deployRootOverrides` 里登记。

## 二、日常使用（本地一条命令，推荐）

```powershell
# 一键发布：本地构建 → 打包 → 上传 → 触发服务器 deploy.sh 发布
.\deploy-shell\ship.ps1 vue-web production

# 常用变体
.\deploy-shell\ship.ps1 react-web test -SkipBuild                    # 复用现有 dist，只传包+发布
.\deploy-shell\ship.ps1 vue-web uat -Status                          # 查看服务器当前版本/可回滚版本/待发布包
.\deploy-shell\ship.ps1 vue-web production -Rollback 20260826-101500-e7604be   # 回滚到指定版本
.\deploy-shell\ship.ps1 react-web production -DryRun                 # 只打印计划，不执行
```

- 服务器/账号/路径/构建命令全部读取 `deploy.config.json`（与 pnpm ship 同源）
- 首次使用前先复制模板并填入真实信息：
  `Copy-Item deploy.config.example.json deploy.config.json`
  （真实配置已被 .gitignore 忽略，不会误提交）
- scp/ssh 为交互式：密钥失效时会**正常提示输密码**，不会像 Node 管线那样卡死
- 发布前自动做 index.html 业务兜底检查；远端同样强校验（防白屏上线）
- 分支与环境不匹配时给出警告（不阻断——应急场景可能就是不在标准分支）

## 三、纯手动兜底（仅当 ship.ps1 无法使用时才需要，日常请用第二节）

### 1. 本地构建（仓库根目录）

```powershell
pnpm --filter @apps/vue-web build:test      # 或 build:uat / build
pnpm --filter @apps/react-web build
```

### 2. 打包 + 上传（Git Bash）

```bash
APP=vue-web
OUT=apps/$APP/dist
SHA=$(git rev-parse --short HEAD)
tar -czf dist-$SHA.tar.gz -C $OUT .
sha256sum dist-$SHA.tar.gz > dist-$SHA.tar.gz.sha256
scp dist-$SHA.tar.gz dist-$SHA.tar.gz.sha256 deploy@203.0.113.30:/data/nginx/html/vue-web/incoming/
```

### 3. 服务器上执行发布

```bash
ssh deploy@203.0.113.30 /data/nginx/deploy-shell/deploy.sh vue-web
```

## 四、服务器端 deploy.sh 常用操作

```bash
DE=/data/nginx/deploy-shell/deploy.sh

$DE list-apps              # 2 个 app 与服务器目录映射
$DE vue-web status         # 当前版本 / 可回滚版本 / 待发布包
DRY_RUN=1 $DE vue-web      # 演练：只打印计划不执行
$DE vue-web rollback       # 交互式回滚（列版本选择）
$DE vue-web rollback 20260826-101500-e7604be    # 回滚到指定版本
```

## 五、上传目标目录对照（按 deploy.config.json 示例配置）

| app       | 上传到（incoming/）                  |
| --------- | ------------------------------------ |
| vue-web   | /data/nginx/html/vue-web/incoming/   |
| react-web | /data/nginx/html/react-web/incoming/ |

nginx 根路径不同的机器在服务器上执行时用环境变量覆盖：
`DEPLOY_ROOT=/usr/local/nginx/html $DE vue-web`
（ship.ps1 的 `$deployRootOverrides` 登记后触发时已自动带上）。

## 六、安全说明

- **不会碰 nginx conf**：所有写操作封闭在 `<app>/incoming/`、`<app>/releases/` 和 `current` 软链内
- **原子切换**：`ln -sfn + mv -Tf`，切换瞬间完成，失败时 current 不动
- **业务兜底**：本地远端双重校验 `index.html`，缺失则清理并中止（防白屏上线）
- **可回滚**：保留最近 5 个版本（`KEEP_RELEASES` 可调），回滚秒级
- **权限要求**：服务器执行账号对 nginx html 根目录有写权限即可（建议用独立部署账号而非 root）
