# =============================================================================
# ship.ps1 —— 本地一键发布入口（在本地 PowerShell 执行）
#
# 流程: 本地构建 → tar 打包(+sha256) → scp 上传到服务器 incoming/
#       → ssh 触发服务器上的 deploy.sh 完成发布(校验/解压/原子切换/清理)
#
# 用法:
#   .\ship.ps1 <app> <env>                    一键发布(构建+打包+上传+服务器发布)
#   .\ship.ps1 <app> <env> -SkipBuild         复用现有 dist, 只打包+上传+发布
#   .\ship.ps1 <app> <env> -Status            查看服务器当前版本/可回滚版本/待发布包
#   .\ship.ps1 <app> <env> -Rollback <版本名>  回滚到指定版本
#   .\ship.ps1 <app> <env> -DryRun            只打印计划, 不构建不执行
#
# 示例:
#   .\ship.ps1 vue-web production
#   .\ship.ps1 react-web test -Status
#   .\ship.ps1 vue-web production -Rollback 20260826-101500-e7604be
#
# 说明:
#   - 服务器/账号/路径全部读取仓库根 deploy.config.json, 与 pnpm ship 同源
#   - scp/ssh 为交互式: 密钥失效时会正常提示输密码, 不会卡死(区别于 Node 管线)
#   - 前提: 服务器已铺设 deploy.sh(见 README 第一节)
# =============================================================================
param(
   [Parameter(Mandatory = $true, Position = 0)][string]$App,
   [Parameter(Mandatory = $true, Position = 1)][string]$EnvName,
   [switch]$SkipBuild,
   [switch]$Status,
   [string]$Rollback = "",
   [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 基础校验
# ---------------------------------------------------------------------------
$validApps = @("vue-web", "react-web")
$validEnvs = @("test", "uat", "production")

if ($validApps -notcontains $App) { Write-Error "未知 app: $App（可用: $($validApps -join ' ')）" }
if ($validEnvs -notcontains $EnvName) { Write-Error "未知环境: $EnvName（可用: $($validEnvs -join ' ')）" }

$repoRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoRoot "deploy.config.json"
if (-not (Test-Path $configPath)) {
   Write-Error "找不到 $configPath（先复制模板: Copy-Item deploy.config.example.json deploy.config.json 并填入真实服务器信息）"
}

# 读取部署配置（与 pnpm ship 同源, 单一事实来源）
$cfg = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$target = $cfg.$App.$EnvName
if (-not $target) { Write-Error "deploy.config.json 缺少 ${App}.${EnvName} 配置" }

# ---------------------------------------------------------------------------
# 服务器端 deploy.sh 路径（铺设位置见 README 第一节，不同机器可在此调整）
# DEPLOY_ROOT 覆盖表: 仅当某环境 nginx 根路径不是脚本默认值 /data/nginx/html 时填写
# ---------------------------------------------------------------------------
$remoteScript = "/data/nginx/deploy-shell/deploy.sh"
$deployRootOverrides = @{}
# 示例: 某环境 nginx 根在 /usr/local/nginx/html 时:
# $deployRootOverrides = @{ test = "/usr/local/nginx/html" }

# ---------------------------------------------------------------------------
# ssh/scp 公共参数（对齐 Node 管线: 跳过 host key 校验避免本机 known_hosts 冲突）
# ---------------------------------------------------------------------------
$sshKey = $target.sshKeyPath -replace "^~[/\\]", "$($env:USERPROFILE.ToString())\"
if (-not (Test-Path $sshKey)) { Write-Warning "私钥不存在: $sshKey（将尝试默认密钥/密码认证）" }
$destHost = "$($target.user)@$($target.host)"
$sshCommon = @("-i", $sshKey, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "ConnectTimeout=10")
$sshArgs = $sshCommon + @("-p", "$($target.port)")
$scpArgs = $sshCommon + @("-P", "$($target.port)")

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }

# ---------------------------------------------------------------------------
# 远端只读/回滚动作（无需构建打包）
# ---------------------------------------------------------------------------
if ($Status) {
   Write-Info "查询 $App($EnvName) 远端状态 ..."
   & ssh @sshArgs $destHost "$remoteScript $App status"
   exit $LASTEXITCODE
}
if ($Rollback -ne "") {
   Write-Info "回滚 $App($EnvName) → $Rollback ..."
   & ssh @sshArgs $destHost "$remoteScript $App rollback $Rollback"
   exit $LASTEXITCODE
}

# ---------------------------------------------------------------------------
# 分支提醒（不阻断——兜底通道应急时可能就是不在标准分支上）
# ---------------------------------------------------------------------------
$expectBranch = @{ test = "test"; uat = "uat"; production = "main" }[$EnvName]
$curBranch = git -C $repoRoot branch --show-current 2>$null
if ($curBranch -and $curBranch -ne $expectBranch) {
   Write-Warning "当前分支 '$curBranch' 与 $EnvName 环境期望分支 '$expectBranch' 不一致（继续执行, 请自行确认）"
}

# ---------------------------------------------------------------------------
# 计划总览
# ---------------------------------------------------------------------------
$sha = (git -C $repoRoot rev-parse --short HEAD 2>$null)
if (-not $sha) { $sha = "nocommit" } else { $sha = $sha.Trim() }
$tarName = "dist-$sha.tar.gz"

Write-Info "app=$App  env=$EnvName  分支=$curBranch  commit=$sha"
Write-Info "服务器: $destHost  deployPath=$($target.deployPath)"
Write-Info "产物:   $($target.outDir)  (buildCmd=$($target.buildCmd))"

if ($DryRun) {
   Write-Info "[DRY-RUN] 计划: 构建 → 打包 $tarName → 上传 incoming/ → 远端 $remoteScript $App"
   exit 0
}

# ---------------------------------------------------------------------------
# Step 1: 构建
# ---------------------------------------------------------------------------
if ($SkipBuild) {
   Write-Info "[BUILD] 跳过构建(-SkipBuild), 复用现有产物"
} else {
   $appDir = Join-Path $repoRoot "apps\$App"
   if (-not (Test-Path $appDir)) { Write-Error "应用目录不存在: $appDir" }
   Write-Info "[BUILD] pnpm run $($target.buildCmd) (apps/$App) ..."
   Push-Location $appDir
   try { & pnpm run $target.buildCmd }
   finally { Pop-Location }
   if ($LASTEXITCODE -ne 0) { Write-Error "构建失败: pnpm run $($target.buildCmd)" }
}

# ---------------------------------------------------------------------------
# Step 2: 打包（含 index.html 业务兜底检查）
# ---------------------------------------------------------------------------
$outDir = Join-Path $repoRoot ($target.outDir -replace "/", "\")
if (-not (Test-Path (Join-Path $outDir "index.html"))) {
   Write-Error "产物缺少 index.html: $outDir（构建失败或 outDir 配置有误, 已中止, 未上传）"
}

$tmpDir = Join-Path $env:TEMP "ship-$sha"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$tarPath = Join-Path $tmpDir $tarName

Write-Info "[PACK] $tarName ..."
& tar -czf $tarPath -C $outDir .
if ($LASTEXITCODE -ne 0) { Write-Error "tar 打包失败" }
$hash = (Get-FileHash $tarPath -Algorithm SHA256).Hash.ToLower()
"$hash  $tarName" | Set-Content -Path "$tarPath.sha256" -Encoding ascii
$sizeMB = [math]::Round((Get-Item $tarPath).Length / 1MB, 1)
Write-Ok "[PACK] $tarName (${sizeMB}MB) sha256=$($hash.Substring(0, 10))..."

# ---------------------------------------------------------------------------
# Step 3: 上传（scp 交互式——密钥失效会提示密码, 不会卡死）
# ---------------------------------------------------------------------------
$incoming = "$($target.deployPath)/incoming"
Write-Info "[UPLOAD] → $destHost`:$incoming/ ..."
& ssh @sshArgs $destHost "mkdir -p $incoming"
if ($LASTEXITCODE -ne 0) { Write-Error "远端 mkdir incoming 失败（网络/账号/权限?）" }
& scp @scpArgs "$tarPath" "$tarPath.sha256" "${destHost}:$incoming/"
if ($LASTEXITCODE -ne 0) { Write-Error "上传失败" }
Write-Ok "[UPLOAD] 完成 (${sizeMB}MB)"

# ---------------------------------------------------------------------------
# Step 4: 触发服务器端 deploy.sh 发布（真正的发布动作在服务器上执行）
# ---------------------------------------------------------------------------
$envPrefix = ""
if ($deployRootOverrides[$EnvName]) { $envPrefix = "DEPLOY_ROOT=$($deployRootOverrides[$EnvName]) " }
Write-Info "[REMOTE] $remoteScript $App ..."
& ssh @sshArgs $destHost "$envPrefix$remoteScript $App"
if ($LASTEXITCODE -ne 0) { Write-Error "远端发布失败（exit $LASTEXITCODE）——包已在 incoming/, 可登录服务器排查后重试" }

# ---------------------------------------------------------------------------
# 清理本地临时包
# ---------------------------------------------------------------------------
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
Write-Ok "发布完成: $App → $EnvName"
