# SSH 公钥认证 + 自动部署指南

本指南覆盖**三件事**：

1. 第一次部署前：在本地生成 SSH 密钥、放到服务器、验证免密登录
2. 公钥就绪后：日常用 `pnpm ship` 把前端构建产物发布到 test / uat / production 服务器
3. release 版本化部署与回滚

读完后，所有同事都能从 Windows / macOS / Linux 客户端对 test / uat / production
服务器做免密发布。

> 本文中的服务器 IP（`192.0.2.10` / `198.51.100.20` / `203.0.113.30`）与账号
> `deploy` 均为 `deploy.config.example.json` 里的示例占位值，使用时替换为真实信息。

---

## 0. 为什么需要

`pnpm ship` 脚本（见 `scripts/deploy/`）通过 SSH 客户端（`ssh` + `tar`）把前端构建产物
上传到服务器。整个流程**不允许交互式输入密码**，必须用 SSH 公钥认证。

SSH 公钥认证是非对称加密：一台机器只能登录与本地私钥**配对**的服务器账号。

```
┌─────────── 你的电脑 ──────────┐         ┌─────────── 服务器 ──────────┐
│                              │         │                              │
│  ~/.ssh/id_ed25519           │  SSH  ► │  /home/deploy/.ssh/         │
│  （私钥 ⛔ 不可分享）          │  ◄════ │  authorized_keys（公钥）     │
│                              │         │                              │
│                              │         │  deploy 用户                 │
└──────────────────────────────┘         └──────────────────────────────┘
```

**一台服务器可放任意多个公钥**（每行一个），所以团队里每个人都可以独立密钥登录，互不干扰。

---

## 1. 检查本地是否已有密钥

打开终端，先看本地有没有现成的密钥：

| 平台                 | 命令             |
| -------------------- | ---------------- |
| Windows (PowerShell) | `ls $HOME\.ssh\` |
| macOS / Linux        | `ls -la ~/.ssh/` |

看到下面这种输出，说明已有，可以直接用：

```text
id_rsa           # 私钥（RSA 算法）
id_rsa.pub       # 公钥（RSA 算法）
id_ed25519       # 私钥（Ed25519 算法，更现代）
id_ed25519.pub   # 公钥（Ed25519 算法）
```

如果没有这些文件，进入第 2 步生成。

---

## 2. 生成新密钥（首次配置）

### 2.1 推荐算法

**Ed25519** 是当前推荐算法（短、更快、更安全）。`ssh-keygen` 的默认算法现在也是 Ed25519。

### 2.2 各平台命令

#### Windows（PowerShell 或 Git Bash）

```powershell
# 推荐：Ed25519
ssh-keygen -t ed25519 -C "your-name@your-email"

# 备选：RSA（如果服务器 OpenSSH 太老 < 6.5）
ssh-keygen -t rsa -b 4096 -C "your-name@your-email"
```

执行后会问 3 个问题：

```text
Enter file in which to save the key (C:\Users\<you>\.ssh\id_ed25519):    [直接回车]
Enter passphrase (empty for no passphrase):                            [推荐留空，部署脚本免密]
Enter same passphrase again:                                           [再次回车]
```

> **不建议设置密码**：单次部署流程不能中断，设置密码会要求每次 `pnpm ship` 都输入一次
> 密码才能解锁私钥。如果担心私钥安全，靠系统的文件权限（macOS/Linux 600）和磁盘
> 加密 (Windows BitLocker / macOS FileVault) 保护更现实。

#### macOS / Linux

```bash
ssh-keygen -t ed25519 -C "your-name@your-email"
# 或指定文件名，不覆盖现有密钥
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_deploy -C "your-name@your-email"
```

---

## 3. 查看并复制公钥

公钥是**公开**的，可以放心分享给运维或贴到工单、私信。

| 平台          | 命令                                    |
| ------------- | --------------------------------------- |
| Windows       | `Get-Content $HOME\.ssh\id_ed25519.pub` |
| macOS / Linux | `cat ~/.ssh/id_ed25519.pub`             |

输出形如：

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx your-name@your-email
```

**整行全部复制**（含 `ssh-ed25519` 开头和你邮箱注释结尾）。

> ⚠️ **不要把 `id_rsa` / `id_ed25519` 私钥文件分享给任何人**。私钥泄露 = 服务器失陷。

---

## 4. 把公钥放到服务器

有两种方式：找运维帮忙，或自己用密码登录一次。

下文以生产服务器 `deploy@203.0.113.30` 为例，test / uat 服务器换成
`deploy.config.json` 里对应环境的账号与 IP。

### 4.1 方式 A：找运维帮忙（推荐）

把第 3 步复制的公钥发给运维 / 团队管理员，告诉他：

> "请将以下公钥追加到 [test / uat / production] 服务器 `deploy` 账号的
> `~/.ssh/authorized_keys` 文件末尾。"

运维侧的标准操作：

```bash
# 1. 服务端追加公钥（运维或你登录后）
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxx... your-name@your-email" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

如果是多人协作的服务器，把每个同事的公钥都追加到同一文件即可（每行一个）。

> 公钥要加到**部署账号**（示例为 `deploy`）的 `~/.ssh/authorized_keys`
> （通常是 `/home/deploy/.ssh/authorized_keys`）。此外部署账号必须对项目目录
> （deployPath）有写权限，详见 7.7；新账号的完整准入条件见 7.9。

### 4.2 方式 B：自己用密码登录一次

如果服务器还能用密码登录（首次部署 / 临时环境）：

```bash
# Windows (Git Bash) / macOS / Linux 通用
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@203.0.113.30
# 输入服务器密码，完成后免密登录就生效了
```

`ssh-copy-id` 会自动处理目录创建、权限修正、追加公钥三件事。

如果没有 `ssh-copy-id`（Windows PowerShell 默认没装），手动操作：

```bash
# 1. 用密码登录服务器
ssh deploy@203.0.113.30

# 2. 在服务器上执行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# 把第 3 步的公钥内容粘贴到下面这行（替换 PUBLIC_KEY）
echo "PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
# 退出
exit
```

---

## 5. 验证免密登录

只跑一次手动 SSH，确认公钥配置成功：

```bash
# Windows
ssh -i $HOME\.ssh\id_ed25519 deploy@192.0.2.10 "echo TEST_OK && uname -a"

# macOS / Linux
ssh -i ~/.ssh/id_ed25519 deploy@198.51.100.20 "echo UAT_OK && uname -a"

# 生产（注意是部署账号，不是 root）
ssh -i ~/.ssh/id_ed25519 deploy@203.0.113.30 "echo PROD_OK && uname -a"
```

期望输出（看到 `*_OK` 即成功）：

```text
PROD_OK
Linux web-01 5.x.x.el8.x86_64 #1 SMP ... x86_64 GNU/Linux
```

**如果失败**，看第 6 节排查。

---

## 6. 常见问题排查

### 6.1 `Permission denied (publickey,password)`

```text
deploy@203.0.113.30: Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password).
```

**原因**：服务器找不到匹配你公钥的条目。

排查顺序：

1. **公钥有没有真正加到服务器？**

   ```bash
   # 在你自己电脑上确认公钥
   cat ~/.ssh/id_ed25519.pub
   # 然后登录服务器（或请运维）确认
   ssh deploy@203.0.113.30 "cat ~/.ssh/authorized_keys"
   # 两边内容应有相同一行
   ```

2. **服务器 `~/.ssh` 目录权限是否过宽？**

   ```bash
   # 在服务器上
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   # 让 home 目录也是 755 且属主为账号本身
   chmod 755 /home/deploy
   chown deploy:deploy /home/deploy
   ```

   OpenSSH 拒绝权限过宽的 authorized_keys（默认要求 600 不允许 group/other 写）。

3. **服务器 `/etc/ssh/sshd_config` 禁用密码 + 没启用公钥？**

   ```bash
   # 查看服务器配置
   ssh deploy@203.0.113.30 "grep -E 'PubkeyAuthentication|AuthorizedKeysFile' /etc/ssh/sshd_config"
   ```

   需要确保：

   ```sshd_config
   PubkeyAuthentication yes
   AuthorizedKeysFile .ssh/authorized_keys
   ```

   改完：`systemctl restart sshd`

4. **服务器 SELinux 拦截**（CentOS / RHEL 常见）：
   ```bash
   # 查看 SELinux 状态
   ssh deploy@203.0.113.30 "getenforce"
   # 如果返回 Enforcing，可以暂时关闭验证
   ssh root@203.0.113.30 "setenforce 0"
   # 重试免密登录，成功后 setenforce 1 恢复
   ```
   或在服务器上恢复 SELinux 上下文：
   ```bash
   restorecon -R ~/.ssh
   ```

### 6.2 SSH 连接卡住 10s+ 才报错

Windows 自带 OpenSSH 第一次连接会做**反向 DNS 查找**，如果服务器 PTR 记录乱配就会卡。
绕过：

```bash
ssh -i ~/.ssh/id_ed25519 -o GSSAPIAuthentication=no -o PreferredAuthentications=publickey deploy@203.0.113.30
```

或写入 `~/.ssh/config`（推荐）：

```
Host 203.0.113.30
    GSSAPIAuthentication no
    PreferredAuthentications publickey
    IdentityFile ~/.ssh/id_ed25519
Host 198.51.100.20
    GSSAPIAuthentication no
    PreferredAuthentications publickey
    IdentityFile ~/.ssh/id_ed25519
```

### 6.3 Windows 上 `~/.ssh/id_ed25519` 路径找不到

PowerShell 的 `~` 在脚本里有时不展开。脚本里已经做了 `expandHomePath` 处理（见
`scripts/deploy/deployer.mjs`），但手动跑命令时建议用绝对路径：

```powershell
ssh -i C:\Users\<you>\.ssh\id_ed25519 deploy@203.0.113.30
```

### 6.4 多密钥管理（多个服务器 / 多个账号）

如果本地有多个 SSH 密钥，用 `~/.ssh/config` 配置别名：

```
# 默认密钥
Host *
    AddKeysToAgent yes

# 部署服务器专用（Host 名换成自己环境的别名）
Host prod.deploy.example.com
    HostName 203.0.113.30
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

Host uat.deploy.example.com
    HostName 198.51.100.20
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

配置后可以直接 `ssh prod.deploy.example.com` 登录，不用每次敲 `-i` 和完整 IP。

---

## 7. 执行部署（pnpm ship）

公钥就绪后，发布到 test / uat / production 的标准工作流如下。所有环境统一走
**release 版本化管线**（releases/ + current 软链 + 回滚），详见第 8 章。

### 7.1 前提条件

| 条件                        | 怎么验证                                                          |
| --------------------------- | ----------------------------------------------------------------- |
| SSH 公钥已配置              | `ssh -o BatchMode=yes deploy@<host> whoami`（输出账号名即通过）   |
| 部署账号对项目目录有写权限  | `ssh deploy@<host> "test -w <deployPath> && echo OK"`（详见 7.7） |
| 仓库已拉到本地              | `git pull`                                                        |
| Node ≥ 22.12.0              | `node -v`                                                         |
| `deploy.config.json` 已就绪 | `ls deploy.config.json`（**不随仓库分发**，首次使用先复制模板）   |
| `pnpm install` 已装         | `pnpm install`                                                    |

首次使用先把模板复制为真实配置并填入服务器信息：

```bash
cp deploy.config.example.json deploy.config.json
```

`deploy.config.json` 每个环境包含 7 个字段：

| 字段         | 说明                             | 示例                       |
| ------------ | -------------------------------- | -------------------------- |
| `host`       | 服务器 IP                        | `203.0.113.30`             |
| `port`       | SSH 端口（数字）                 | `22`                       |
| `user`       | SSH 登录用户                     | `deploy`                   |
| `sshKeyPath` | 私钥路径（`~` 自动展开）         | `~/.ssh/id_rsa`            |
| `deployPath` | 应用根（release 目录创建在这里） | `/data/nginx/html/vue-web` |
| `outDir`     | 本地产物目录（相对仓库根）       | `apps/vue-web/dist`        |
| `buildCmd`   | 该 app 的构建脚本名              | `build:test` / `build`     |

### 7.2 第一次部署一个 app（以 `vue-web` 为例）

```bash
# 1. 切换到对应环境分支（test 环境需在 test 分支）
git checkout test && git pull origin test

# 2. 演练（不真传，只打印计划）
pnpm ship vue-web test --dry-run
```

期望输出（关键行）：

```text
[OK]   [BRANCH] 当前分支: test ✓
[INFO] [START] deploy vue-web -> test (dry-run)
[INFO] [CONFIG] 192.0.2.10:22  user=deploy  deployPath=/data/nginx/html/vue-web
[OK]   [SMOKE] index.html 资源检查通过（N 个本地引用）
[INFO] [DRY-RUN] 上传 dist-xxxxxxx.tar.gz → /data/nginx/html/vue-web/incoming/
[OK]   [DRY-RUN] 完成。移除 --dry-run 重新执行即可真实部署。
```

**核对 `[CONFIG]` 行**：host / user / deployPath 必须是你期望的服务器。

```bash
# 3. 真实部署
pnpm ship vue-web test
```

期望输出（关键）：

```text
[OK]   [BRANCH] 当前分支: test ✓
[OK]   [BUILD]  15.6s  产物=apps/vue-web/dist
[OK]   [SMOKE]  index.html 资源检查通过（N 个本地引用）
[INFO] [PACK]   dist-xxxxxxx.tar.gz 打包完成（1.8s）
[OK]   [UPLOAD] 1.2s | 3.7 MB → /data/nginx/html/vue-web/incoming/
[INFO] [REMOTE] 校验 sha256 → 解压 releases/20260831-135348-8b5d46e → 原子切换 current ...
[OK]   [DONE]   20260831-135348-8b5d46e 已切换为 current
```

| 阶段       | 耗时        | 含义                                                                |
| ---------- | ----------- | ------------------------------------------------------------------- |
| `[BRANCH]` | <1s         | git 分支校验（test→test, uat→uat, production→main）                 |
| `[BUILD]`  | 15-60s      | `pnpm --filter @apps/<app> run <buildCmd>` 编译                     |
| `[SMOKE]`  | <1s         | 产物冒烟：解析 index.html 资源引用，校验文件真实存在（防白屏）      |
| `[PACK]`   | 1-3s        | tar 打包为单个 `.tar.gz` + 计算 sha256                              |
| `[UPLOAD]` | 几秒-几十秒 | ssh 上传 tarball 到 `incoming/`（断点续传）                         |
| `[REMOTE]` | 1-3s        | 远端 sha256 校验 + 解压到 `releases/` + `mv -Tf` 原子切换 `current` |
| `[DONE]`   | —           | release 已切换为 current，部署完成                                  |

### 7.3 日常部署

```bash
# 仓库根目录执行（任何 app 都行）
pnpm ship vue-web test
pnpm ship react-web uat
pnpm ship vue-web production
```

支持的 2 个 app：`vue-web` `react-web`

支持的 env：`test` `uat` `production`

### 7.4 验证部署结果

```bash
# 1. 浏览器或 curl 访问站点（nginx root 需指向 <deployPath>/current）
curl -sI https://test.example.com/ | head -1
# 期望：HTTP/1.1 200 OK

# 2. 确认 current 软链指向最新 release
ssh deploy@192.0.2.10 "readlink /data/nginx/html/vue-web/current"

# 3. 列出所有 release 版本（用于回滚参考）
ssh deploy@192.0.2.10 "ls -1t /data/nginx/html/vue-web/releases/"

# 4. nginx 错误日志（如果出现 5xx，路径以实际安装为准）
ssh deploy@192.0.2.10 "tail -n 20 /var/log/nginx/error.log"
```

### 7.5 部署失败怎么办

按失败阶段排查：

| 阶段                    | 症状                                      | 排查                                                                                                               |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 启动                    | `deploy.config.json 不存在`               | 按提示 `cp deploy.config.example.json deploy.config.json` 并填入真实信息                                           |
| 启动                    | `不支持的 app / env`                      | 拼写检查，2 个 app 名和 3 个 env 见 `deploy.config.json`                                                           |
| `[BRANCH]`              | 分支校验失败                              | 按提示 `git checkout <branch>` 切换分支后重跑                                                                      |
| `[CONFIG]`              | 字段缺失                                  | 检查 `deploy.config.json` 对应 app 的 7 个字段（host / port / user / sshKeyPath / deployPath / outDir / buildCmd） |
| `[BUILD]`               | pnpm 报错                                 | 单独跑 `pnpm --filter @apps/vue-web build:test` 看详细                                                             |
| `[PACK]`                | tar 打包失败                              | 确认上一步 `[BUILD]` 成功且产物路径正确                                                                            |
| `[UPLOAD]`              | ssh 上传失败                              | 看第 6 章 SSH 排查；断连可重跑（断点续传）                                                                         |
| `[REMOTE]`              | sha256 校验失败                           | 上传中断导致 tarball 截断，远端已自动清理 incoming，重跑即可                                                       |
| `[REMOTE]`              | `index.html` 不存在                       | 产物目录结构异常，检查 vite 构建配置                                                                               |
| `[SMOKE]`               | 引用的资源在产物中不存在                  | 构建成功但资源断链（上线会白屏）：检查 vite 的 `base` 配置、public 目录是否漏拷、产物目录是否完整                  |
| `[SMOKE]`               | base 前缀与 deployPath 末段不一致（警告） | 构建带 `/<前缀>/` base 但 deployPath 末段不同：人工核对 nginx `location` 与构建 base 是否匹配（不阻断部署）        |
| `[UPLOAD]` / `[REMOTE]` | `Permission denied`                       | 部署账号对项目目录（deployPath）无写权限，见 7.7                                                                   |

复现错误 + 反馈给项目 owner 时的标准格式：

```text
# 错误类型（cp 完整输出）
$ pnpm ship vue-web test
[OK]   [BRANCH] 当前分支: test ✓
[INFO] [START] deploy vue-web -> test
[INFO] [CONFIG] 192.0.2.10:22  user=deploy  deployPath=/data/nginx/html/vue-web
[INFO] [BUILD]  pnpm --filter @apps/vue-web build:test
... [中间报错拷贝过来] ...

# 环境信息
node -v       # 22.x.x
pnpm -v       # 10.18.3
git status    # 工作树是否干净
```

### 7.6 服务器目录结构

所有环境（test / uat / production）统一使用 release 版本化目录结构：

```
<deployPath>/                          ← deploy.config.json 中配置的应用根
├── releases/
│   ├── 20260831-135348-8b5d46e/       ← 每次部署一个目录（时间戳 + git 短 sha）
│   ├── 20260831-140102-9c1e2f3/       ← 最新版本（保留回滚）
│   └── ...                            ← 保留最近 5 个，超出自动清理
├── current → releases/20260831-140102-9c1e2f3   ← 软链（nginx root 指向这里）
└── incoming/                          ← 上传暂存区（校验通过后自动清空）
```

> **nginx 配置**：每个 app 的 `root` 需指向 `<deployPath>/current`（而非 `<deployPath>`）。
> 首次部署前需手动修改服务器 nginx 配置并 reload，否则 nginx 仍服务旧的平铺文件。

nginx 配置变更示例（以 vue-web 为例）：

```nginx
# 改之前（flat 目录直接服务）
server {
    listen 443 ssl;
    server_name test.example.com;
    root /data/nginx/html/vue-web;          # ← 旧
    index index.html;
}

# 改之后（跟随 current 软链）
server {
    listen 443 ssl;
    server_name test.example.com;
    root /data/nginx/html/vue-web/current;  # ← 新：加 /current
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# 改完后测试 + reload（路径以实际安装为准）
nginx -t && nginx -s reload
```

> **旧平铺文件**：首次 release 部署后，`<deployPath>/` 下原有的扁平文件（`css/`、`js/`、
> `index.html` 等）成为孤儿，不影响服务，可后续手动清理。

清理旧平铺文件（保留 `incoming`、`current`、`releases` 三个条目，删除其余所有）：

```bash
# 1. 先预览将要删除的内容（不执行删除）
ssh deploy@<host> "cd <deployPath> && find . -maxdepth 1 -mindepth 1 \
  ! -name incoming \
  ! -name current \
  ! -name releases \
  -exec ls -ld {} \;"

# 2. 确认无误后执行删除
ssh deploy@<host> "cd <deployPath> && find . -maxdepth 1 -mindepth 1 \
  ! -name incoming \
  ! -name current \
  ! -name releases \
  -exec rm -rf {} +"
```

### 7.7 部署账号与项目目录权限

建议**不用 root 部署**：`deploy.config.json` 中各环境条目的 `user` 使用独立部署账号
（示例为 `deploy`）。这带来两个额外要求：

1. **SSH 公钥加到部署账号**：追加到该账号的 `~/.ssh/authorized_keys`
   （通常是 `/home/deploy/.ssh/authorized_keys`），不是 `/root/.ssh/`。
2. **部署账号必须对项目目录（deployPath）有写权限**，否则部署会在上传 / 切换阶段报
   `Permission denied`。

#### 部署账号需要哪些目录权限

部署脚本在应用根（如 `/data/nginx/html/vue-web`）下要完成这些动作，每一步都依赖相应权限：

| 脚本动作                                | 需要的权限                                                 |
| --------------------------------------- | ---------------------------------------------------------- |
| 创建 `incoming/`、`releases/<rel>/`     | deployPath **写 + 执行**（目录尚不存在时还需父目录写权限） |
| 上传 tarball 到 `incoming/`（`cat >>`） | `incoming/` 写                                             |
| 解压到 `releases/<rel>/`                | `releases/<rel>/` 写                                       |
| `ln -s` + `mv -Tf` 原子切换 `current`   | deployPath **写 + 执行**                                   |
| 清理超量旧 release（`rm -rf`）          | `releases/` 及其子内容写                                   |

简化记忆：**部署账号对 deployPath 及其全部子内容具备 rwx**。nginx 只需要**读**
`current/` 下的静态文件，两者互不冲突。

#### 运维授权操作（root 执行一次，`<user>` 换成部署账号名）

```bash
# 方式 A：目录整体归属部署账号（推荐——nginx html 根只服务前端发布）
chown -R <user>:<user> /data/nginx/html

# 方式 B：保留原属主，按组授权
groupadd deploy-group
chgrp -R deploy-group /data/nginx/html
chmod -R g+rwx /data/nginx/html
find /data/nginx/html -type d -exec chmod g+s {} \;   # 新建子目录继承组
usermod -aG deploy-group <user>

# 方式 C：ACL 精细授权（不改动已有属主与权限位）
setfacl -R -m u:<user>:rwx /data/nginx/html
setfacl -R -d -m u:<user>:rwx /data/nginx/html   # 默认 ACL：新建文件/目录自动继承
```

> 授权范围到 nginx html 根（如 `/data/nginx/html`）即可，**不要**把部署账号的写权限
> 扩大到 nginx 配置、日志或其他系统目录。

#### 部署前自查

```bash
# 一条命令验证部署账号对应用根有写权限（以 vue-web 为例）
ssh -i ~/.ssh/id_ed25519 deploy@192.0.2.10 "test -w /data/nginx/html/vue-web && echo WRITE_OK || echo NO_WRITE"

# 首次部署（应用根还不存在）时，验证父目录可写
ssh -i ~/.ssh/id_ed25519 deploy@192.0.2.10 "test -w /data/nginx/html && echo PARENT_WRITE_OK || echo PARENT_NO_WRITE"
```

#### 权限不足的典型报错

```text
# [UPLOAD] 阶段：无法写 incoming
bash: /data/nginx/html/vue-web/incoming/20260831-135348-8b5d46e.tar.gz: Permission denied

# [REMOTE] 阶段：无法创建 releases 或切换 current
mkdir: cannot create directory '/data/nginx/html/vue-web/releases': Permission denied
mv: cannot move '.current.tmp.xxx' to 'current': Permission denied
```

处理方式：把报错和 `ls -ld /data/nginx/html /data/nginx/html/<app>` 的输出发给运维，
按上面方式 A/B/C 授权后直接重跑 `pnpm ship <app> <env>`——上传支持断点续传，
重跑不会产生脏状态。

### 7.8 事故记录：部署账号权限误伤导致发布卡死

> 来自源项目的一次真实事故（细节已脱敏），教训通用，保留于此。

**背景**：生产部署账号变更（`deploy.config.json` 全部 production 条目的 `user`
字段更新为新账号）。切换后首次发布失败。

**现象**：`pnpm ship <app> production` 卡在 `[UPLOAD]` 阶段，spinner 无限旋转：

```text
[OK]   [PACK] dist-e7604be.tar.gz 打包完成（2.1s）
⠴ [UPLOAD] dist-e7604be.tar.gz (12.6 MB) → /data/nginx/html/<app>/incoming/<user>@<host>'s password:
```

**为什么是卡死而不是报错**：上传阶段脚本是 `tar 数据流 → ssh.stdin → 远端 cat > file`
的管道设计。ssh 公钥认证失败后退化到密码认证，密码提示打到了终端，但脚本进程的
stdin 正被 tar 数据流占用、无人转发键盘输入 → 密码永远等不到响应 → Promise 永不
resolve。**中断安全**（incoming 支持断点续传 + sha256 兜底），Ctrl+C 后修复根因重跑即可。

**根因链**（服务器侧账号配置缺陷，与密钥文件本身无关）：

```text
/home/<user> 属主为 root:<部署组> 且权限 775（组可写）
   ↓
sshd StrictModes（CentOS 默认开启）校验信任链 home → .ssh → authorized_keys，
发现 home 组可写，判定 authorized_keys 可能被同组用户篡改
   ↓
静默拒绝公钥认证（服务器 /var/log/secure 记录
"Authentication refused: bad ownership or modes"，但客户端只看到失败）
   ↓
ssh 退化密码认证 → 密码提示 → 脚本卡死
```

> 注意：当时 `.ssh`（700）和 `authorized_keys`（600、内容完整）**都是对的**，
> 只错在 home 目录一层——StrictModes 校验的是完整链条，任何一环组可写都整链拒绝。
> home 被改成 `root:<部署组>` 的原因：做发布目录授权时 `chgrp` 范围打大，误伤了 home。

**修复**（服务器 root 执行 3 条命令）：

```bash
chown <user>:<user> /home/<user>        # home 属主归还账号本身
chmod g-w /home/<user>                  # 去掉组写位（775 → 755）
restorecon -Rv /home/<user>/.ssh        # SELinux 上下文矫正（Enforcing 时需要）
```

**本次排查的关键命令**（下次遇到同类问题直接照用）：

```bash
# ① 本地：强制快速失败定位（BatchMode 禁用交互，不再挂起）
ssh -v -i ~/.ssh/id_ed25519 -o BatchMode=yes <user>@<host> whoami

# ② 服务器：检查信任链三件套（本次事故在第 1 行暴露问题）
stat -c '%a %U:%G %n' /home/<user> /home/<user>/.ssh /home/<user>/.ssh/authorized_keys

# ③ 服务器：拒绝原因实锤
grep -i 'refused\|bad ownership' /var/log/secure | tail -5
```

### 7.9 新部署账号准入清单（新账号必须全部满足才能用于自动发布）

任何新账号（或账号变更）要写进 `deploy.config.json` 作为部署账号，必须**同时满足**
以下全部条件。缺任何一条都会复现 7.8 的事故（卡死 / Permission denied / 认证失败）：

| #   | 条件                             | 标准                                                         | 验证命令                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | 账号存在且有独立 home            | `id <user>` 正常返回                                         | `id <user>`                                                                  |
| 2   | 发布机公钥已装入账号             | authorized_keys 含公钥整行（无截断/换行损坏）                | `cat /home/<user>/.ssh/authorized_keys`                                      |
| 3   | **home 目录属主正确且不可组写**  | `755 <user>:<user>`——**7.8 事故的根因就在这条**              | `stat -c '%a %U:%G %n' /home/<user>`                                         |
| 4   | `.ssh` 权限                      | `700 <user>:<user>`                                          | `stat -c '%a %U:%G %n' /home/<user>/.ssh`                                    |
| 5   | `authorized_keys` 权限           | `600 <user>:<user>`                                          | 同上                                                                         |
| 6   | SELinux 上下文（Enforcing 时）   | restorecon 矫正过                                            | `getenforce`；`ls -Z /home/<user>/.ssh/authorized_keys`                      |
| 7   | sshd 允许该账号                  | `PubkeyAuthentication yes`；无 `AllowUsers`/`DenyUsers` 拦截 | `grep -E 'PubkeyAuthentication\|AllowUsers\|DenyUsers' /etc/ssh/sshd_config` |
| 8   | **免密登录实测通过**             | 输出账号名且 `exit=0`                                        | `ssh -o BatchMode=yes <user>@<host> whoami`                                  |
| 9   | 对各应用 deployPath 有写权限     | 在部署组（方式 B）或等效 ACL 授权                            | `ssh ... "test -w /data/nginx/html/vue-web && echo OK"`                      |
| 10  | 本地 `deploy.config.json` 已更新 | 对应环境条目 `user` 字段（真实配置不提交 git）               | 本地核对                                                                     |

**一次性铺设命令**（服务器 root 执行，`<new>` 换成新账号名，覆盖条件 1-6、9）：

```bash
# 公钥安装 + 信任链权限（一步到位）
id <new> || useradd -m <new>
mkdir -p /home/<new>/.ssh
echo "<发布机公钥整行>" >> /home/<new>/.ssh/authorized_keys
chown -R <new>:<new> /home/<new>            # ← 关键：home 整体归还账号（防 7.8 复发）
chmod 755 /home/<new>
chmod 700 /home/<new>/.ssh
chmod 600 /home/<new>/.ssh/authorized_keys
restorecon -Rv /home/<new>/.ssh

# 发布目录写权限（组方式；或按 7.7 的方式 A/C 授权）
usermod -aG deploy-group <new>

# 安全收敛：移除高危组（docker 组 = 无密码 root 等价，发布脚本完全用不到）
id <new>                                          # groups 里不应有 docker / wheel
gpasswd -d <new> docker 2>/dev/null || true
```

**本地终判**（条件 8、9 的最终标准，两条全过即具备发布资格）：

```bash
# Windows PowerShell
ssh -o BatchMode=yes <new>@<host> whoami                                  # 输出 <new>，exit=0
ssh -o BatchMode=yes <new>@<host> "test -w /data/nginx/html/vue-web && echo WRITE_OK"
```

终判通过后再改本地 `deploy.config.json`，然后 `pnpm ship <app> <env> --dry-run`
演练 → 真实发布。

---

## 8. release 版本化部署与回滚（所有环境）

所有环境（test / uat / production）统一采用 **Capistrano 风格的 release 版本化**
布局。核心优势：

- **零中断切换**：每次部署创建独立 release 目录，通过原子软链切换，nginx 服务不中断
- **秒级回滚**：保留最近 5 个版本，一条命令即可回滚
- **断连安全**：上传与切换阶段隔离，网络中断不会产生脏状态

### 8.1 服务器目录结构

```
<deployPath>/                          ← 应用根（如 /data/nginx/html/vue-web）
├── releases/
│   ├── 20260831-135348-8b5d46e/       ← 每次部署一个目录（时间戳 + git 短 sha）
│   ├── 20260831-140102-9c1e2f3/       ← 最新版本
│   └── ...                            ← 超 5 个自动清理（保留用于回滚）
├── current → releases/20260831-140102-9c1e2f3   ← 软链（nginx root 指向这里）
└── incoming/                          ← 上传暂存区（校验通过后清空）
```

nginx 配置 `root` 指向 `<deployPath>/current`（跟随软链）。

### 8.2 部署命令

```bash
# 演练（不真传，只打印计划）
pnpm ship vue-web production --dry-run

# 真实部署（构建 → 打包 → 上传 → 校验 → 解压 → 原子切换）
pnpm ship vue-web production
```

> **分支要求**：所有环境都有分支校验，不匹配则拒绝部署。
> test → test 分支，uat → uat 分支，production → main 分支。

### 8.3 部署流程（4 阶段）

```
[本地]  构建 → tar 打包 → 生成 sha256
   │
   ▼
① 上传 tarball 到 incoming/          ← 断连可整体重跑，不污染服务
   │
   ▼
② 远端 sha256sum -c 校验              ← fail-closed，校验不过不进解压
   │
   ▼
③ 解压到 releases/<时间戳>-<sha>/     ← 独立完整目录，失败可整体丢弃
   │
   ▼
④ ln -s tmp + mv -Tf 原子切换 current ← 单次 rename(2)，零窗口
   │
   ▼
[收尾] 清理旧 release（保留 5 个）+ 清理 incoming
```

### 8.4 回滚

```bash
# 交互式选择版本
pnpm ship vue-web production --rollback

# 或直接指定版本号
pnpm ship vue-web production --rollback 20260831-135348-8b5d46e
```

交互式输出示例：

```text
[INFO] 可选 release（当前: 20260831-140102-9c1e2f3）:
[INFO]   [1] 20260831-140102-9c1e2f3
[INFO]   [2] 20260831-135348-8b5d46e
输入序号或 release 名：2
[OK]   [ROLLBACK] current → releases/20260831-135348-8b5d46e
```

回滚原理：将 `current` 软链原子切换到旧 release 目录（`ln -s tmp + mv -Tf`），nginx 自动
跟随新软链，**无需 reload**，已打开的文件描述符不受影响。

### 8.5 手动回滚（不使用脚本）

以 vue-web（test 环境）为例，服务器 `192.0.2.10`，应用根
`/data/nginx/html/vue-web`：

```bash
# 1. 查看可用版本（按时间倒序，最新在上）
ssh deploy@192.0.2.10 "ls -1t /data/nginx/html/vue-web/releases/"
# 输出：
# 20260831-140102-9c1e2f3
# 20260831-135348-8b5d46e

# 2. 确认当前指向哪个版本
ssh deploy@192.0.2.10 "readlink /data/nginx/html/vue-web/current"
# 输出：releases/20260831-140102-9c1e2f3

# 3. 原子切换到旧版本（秒级，nginx 无需 reload）
ssh deploy@192.0.2.10 "cd /data/nginx/html/vue-web && ln -s releases/20260831-135348-8b5d46e .current.tmp.20260831-135348-8b5d46e && mv -Tf .current.tmp.20260831-135348-8b5d46e current"

# 4. 确认切换成功
ssh deploy@192.0.2.10 "readlink /data/nginx/html/vue-web/current"
# 输出：releases/20260831-135348-8b5d46e
```

> **为什么用 `mv -Tf` 而不是 `ln -sfn`**：`ln -sfn` 底层是 `unlink + symlink` 两步，
> 中间有极短窗口期请求会 404。`mv -Tf` 是单次 `rename(2)` 系统调用，真正的原子操作。

### 8.6 断连安全性

服务器可能在跨洲际位置，网络不稳定。本方案的防护机制：

| 风险          | 防护                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 上传中断      | **断点续传**：重跑时先 `stat -c %s` 查远端已有字节，Node `createReadStream({start})` 跳过已传部分，远端 `cat >>` 追加剩余字节；无需从头重传 |
| 校验失败      | fail-closed，`set -euo pipefail` 立即退出并 `rm -f` 清理 incoming；不进入解压                                                               |
| 解压中途断连  | release 目录不完整但 `current` 未切换，服务不受影响                                                                                         |
| 切换瞬间断连  | `mv -Tf` 是单次 `rename(2)` 系统调用，要么成功要么不变                                                                                      |
| SSH 连接超时  | 脚本自动加 `-o ConnectTimeout=10 -o ConnectionAttempts=3`（TCP 握手 10s 超时 + 自动重试 3 次）                                              |
| SSH keepalive | 脚本自动加 `-o ServerAliveInterval=30 -o ServerAliveCountMax=5`（每 30s 探测，连续 5 次无响应才判定断连）                                   |
| 并发部署      | 临时软链用 `.current.tmp.<release>` 后缀，两个操作者同时部署不同 release 互不干扰                                                           |

**核心原则**：上传 → 校验 → 解压 → 切换，四个阶段严格隔离。任何阶段失败都不会影响
正在服务的 `current`。

---

## 9. 团队协作场景

### 9.1 新成员加入

1. 走完第 1-5 章生成自己的密钥并加到服务器
2. clone 仓库，复制部署配置模板并填入真实信息：
   `cp deploy.config.example.json deploy.config.json`
3. `pnpm install`
4. 跑 `pnpm ship vue-web test --dry-run` 验证连接

### 9.2 成员离职

从所有服务器的 `authorized_keys` 删掉对应的那一行公钥即可（不要整文件
清空，会影响其他成员）：

```bash
ssh <user>@<host> "vim ~/.ssh/authorized_keys"
# 找到 ssh-ed25519 AAAA...your-name@your-email 那行，删除
```

**立即生效**，OpenSSH 不缓存公钥。

### 9.3 服务器迁移 / 重建

新服务器创建后，把所有成员的公钥**重新追加**（账户和 authorized_keys 都不会自动迁移）。
建议把 `authorized_keys` 当作"基础设施配置"备份到内部 wiki 或密码管理器。
同时按 [`deploy-shell/README.md`](../../deploy-shell/README.md) 第一节重新铺设
服务器端 `deploy.sh`。

---

## 10. 安全注意事项

1. **私钥永不上传 / 不发送**：私钥泄露 = 立即失陷服务器。看到 `id_rsa` / `id_ed25519`
   内容第一时间当成密钥泄露处理（生成新密钥 + 各服务器吊销）。
2. **私钥加密码的代价**：每次 `pnpm ship` 都要人工输入密码，CI 自动化部署会失败。
   部署机器默认不加密码，靠系统级加密（BitLocker / FileVault）+ 文件权限保护。
3. **`deploy.config.json` 含真实服务器信息**：真实配置**不提交 Git**（已被
   `.gitignore` 忽略），仓库只保留脱敏模板 `deploy.config.example.json`。新机器
   需自行复制模板并填入真实信息；服务器变更后各自更新本地配置，通过团队沟通同步。
   **不要把真实配置复制到公开仓库 / 公开 wiki**。
4. **服务器端权限**：建议所有环境都使用独立部署账号（非 root），且只对 nginx html
   根目录授权——权限要求与运维授权操作见 7.7。
5. **撤销机制**：删除 `authorized_keys` 对应行即生效，无需重启 sshd。

---

## 11. 配套参考

- 部署脚本：`scripts/deploy/{deploy,deployer,builder,config,logger}.mjs`
- 部署约定（环境映射、管线流程、接入清单）：
  [`docs/conventions/deployment.md`](../conventions/deployment.md)
- 兜底发布通道（服务器铺设、手动发布）：
  [`deploy-shell/README.md`](../../deploy-shell/README.md)
- 部署服务器清单：仓库根 `deploy.config.json`（本地文件，不提交）

如有任何步骤卡住，**带上完整的 SSH 报错信息**找项目 owner。
