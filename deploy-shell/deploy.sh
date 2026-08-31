#!/usr/bin/env bash
# =============================================================================
# deploy.sh —— 服务器端发布脚本（放在服务器上、登录服务器执行）
#
# 定位：pnpm ship（本地 Node 管线）不可用时的兜底发布通道。
# 与 pnpm ship 的远端逻辑完全同构：
#   incoming/<tar.gz> → 解压 releases/<版本>/ → index.html 业务兜底
#   → current 原子软链切换 → 清理旧版本（保留 N 个）→ 清理 incoming
# 因此两个通道发布的版本可以互相回滚，目录结构完全兼容。
#
# 用法:
#   ./deploy.sh <app>                    发布（自动取 incoming/ 里最新的 *.tar.gz）
#   ./deploy.sh <app> <tarball 文件名>   发布指定包（文件须已放在 incoming/ 内）
#   ./deploy.sh <app> rollback           交互式回滚（列出版本供选择）
#   ./deploy.sh <app> rollback <版本名>  回滚到指定版本
#   ./deploy.sh <app> status             查看当前版本 / 可回滚版本 / 待发布包
#   ./deploy.sh list-apps                列出支持的 app 与服务器目录映射
#
# 环境变量（可选）:
#   DEPLOY_ROOT=/data/nginx/html    应用根目录（nginx 根路径不同的机器可覆盖）
#   KEEP_RELEASES=5                 保留版本数
#   DRY_RUN=1                       只打印计划，不实际执行
#
# 依赖: bash 4+（关联数组）、GNU tar / coreutils（CentOS 自带）
# 执行身份: 任意对 DEPLOY_ROOT 有写权限的账号
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# 配置区
# ---------------------------------------------------------------------------
DEPLOY_ROOT="${DEPLOY_ROOT:-/data/nginx/html}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
DRY_RUN="${DRY_RUN:-0}"

# app 名 → 服务器目录名映射（与 deploy.config.json 的 deployPath 末段一致）
declare -A APP_DIR=(
   [vue-web]="vue-web"
   [react-web]="react-web"
)

# ---------------------------------------------------------------------------
# 输出工具
# ---------------------------------------------------------------------------
c_info() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
c_ok()   { printf '\033[1;32m[OK]  \033[0m %s\n' "$*"; }
c_warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
c_err()  { printf '\033[1;31m[ERR] \033[0m %s\n' "$*" >&2; }
die()    { c_err "$*"; exit 1; }

# bash 版本检查（关联数组需要 4+）
if ((BASH_VERSINFO[0] < 4)); then
   die "需要 bash 4+（当前 ${BASH_VERSION}），CentOS 自带版本即可满足"
fi

# ---------------------------------------------------------------------------
# 公共校验
# ---------------------------------------------------------------------------
# 校验 app 名并打印对应根目录；非法 app 直接退出
resolve_root() {
   local app="$1"
   [[ -n "${APP_DIR[$app]:-}" ]] || die "未知 app: ${app}（可用: list-apps 查看）"
   echo "${DEPLOY_ROOT}/${APP_DIR[$app]}"
}

# 应用根目录存在性与写权限自检
check_root() {
   local root="$1"
   [[ -d "$root" ]] || die "目录不存在: $root（DEPLOY_ROOT 配置是否正确？）"
   if [[ ! -w "$root" ]]; then
      die "当前用户 $(whoami) 对 $root 无写权限（应使用部署组账号，或用 root 执行）"
   fi
}

# 读取 current 软链当前指向的版本名（无则输出 "无"）
current_release() {
   local root="$1" link="$1/current"
   if [[ -L "$link" ]]; then
      basename "$(readlink "$link")"
   else
      echo "无"
   fi
}

# 原子切换 current 软链 → releases/<rel>
switch_current() {
   local root="$1" rel="$2"
   local tmp="$root/.current.tmp.$$"
   ln -sfn "releases/$rel" "$tmp"
   mv -Tf "$tmp" "$root/current"
}

# ---------------------------------------------------------------------------
# 子命令: list-apps
# ---------------------------------------------------------------------------
cmd_list_apps() {
   printf '%-14s %s\n' "APP" "服务器目录"
   printf '%-14s %s\n' "------------" "------------------------------"
   local app
   for app in "${!APP_DIR[@]}"; do
      printf '%-14s %s/%s\n' "$app" "$DEPLOY_ROOT" "${APP_DIR[$app]}"
   done
}

# ---------------------------------------------------------------------------
# 子命令: status
# ---------------------------------------------------------------------------
cmd_status() {
   local root
   root="$(resolve_root "$1")"
   check_root "$root"

   local cur
   cur="$(current_release "$root")"
   c_info "应用根目录 : $root"
   c_info "当前版本   : $cur"
   echo

   # releases 列表（最新在前，标记当前版本）
   if [[ -d "$root/releases" ]] && ls "$root/releases" >/dev/null 2>&1; then
      c_info "可回滚版本（保留最新 ${KEEP_RELEASES} 个）:"
      ls -1t "$root/releases" | while read -r rel; do
         if [[ "$rel" == "$cur" ]]; then
            echo "  $rel   ← current"
         else
            echo "  $rel"
         fi
      done
   else
      c_warn "releases/ 为空或不存在"
   fi
   echo

   # incoming 待发布包
   if ls "$root/incoming"/*.tar.gz >/dev/null 2>&1; then
      c_info "待发布包（incoming/，最新在前）:"
      ls -1t "$root/incoming"/*.tar.gz | while read -r f; do
         echo "  $(basename "$f")  ($(du -h "$f" | cut -f1))"
      done
      c_info "执行 ./deploy.sh $1 发布最新包"
   else
      c_info "incoming/ 无待发布包"
   fi
}

# ---------------------------------------------------------------------------
# 子命令: 发布
# ---------------------------------------------------------------------------
cmd_publish() {
   local app="$1" tarball_name="${2:-}"
   local root
   root="$(resolve_root "$app")"
   check_root "$root"

   local incoming="$root/incoming"
   [[ -d "$incoming" ]] || die "incoming 目录不存在: $incoming（先创建: mkdir -p）"

   # ---- 定位 tar 包：未指定则取 incoming 最新 ----
   local tarball=""
   if [[ -n "$tarball_name" ]]; then
      tarball="$incoming/$tarball_name"
      [[ -f "$tarball" ]] || die "指定的包不存在: $tarball"
   else
      tarball=$(ls -1t "$root/incoming"/*.tar.gz 2>/dev/null | head -n 1 || true)
      [[ -n "$tarball" ]] || die "incoming/ 中没有 *.tar.gz（先从本地上传产物包）"
   fi
   local base size
   base="$(basename "$tarball")"
   size="$(du -h "$tarball" | cut -f1)"

   # ---- release 版本名：时间戳 + 文件名内嵌的 git sha（对齐 pnpm ship 命名）----
   local sha_part rel
   sha_part="$(echo "$base" | sed -E 's/^dist-//; s/\.tar\.gz$//')"
   rel="$(date +%Y%m%d-%H%M%S)-${sha_part}"

   c_info "应用     : $app → $root"
   c_info "发布包   : $base（$size）"
   c_info "版本名   : $rel"
   c_info "当前版本 : $(current_release "$root")"
   echo

   if [[ "$DRY_RUN" == "1" ]]; then
      c_info "[DRY-RUN] 计划: 解压 → 校验 index.html → 切换 current → 清理旧版本（保留 ${KEEP_RELEASES}）"
      c_info "[DRY-RUN] 未做任何改动，去掉 DRY_RUN=1 重新执行即可真实发布"
      return 0
   fi

   # ---- 完整性校验: gzip 可解 + tar 结构完整（损坏立即失败，不部署半包）----
   c_info "校验包完整性 ..."
   tar -tzf "$tarball" >/dev/null || die "tar 包损坏或不完整（重新上传）"

   # 可选 sha256 校验：存在同名 .sha256 文件则强校验（本地生成: sha256sum xxx.tar.gz > xxx.tar.gz.sha256）
   if [[ -f "${tarball}.sha256" ]]; then
      (cd "$incoming" && sha256sum -c "$base.sha256" --status) \
         || die "sha256 校验失败（传输损坏，重新上传）"
      c_ok "sha256 校验通过"
   else
      c_warn "无 .sha256 伴随文件，跳过强校验（tar 结构校验已通过）"
   fi

   # ---- 解压到 releases/<rel>（同名重发 = 删除重建，对齐 pnpm ship 语义）----
   local target="$root/releases/$rel"
   rm -rf "$target"
   mkdir -p "$target"
   tar -xzf "$tarball" -C "$target"

   # ---- 业务兜底: index.html 必须存在，防白屏（与 pnpm ship 的 test -f 一致）----
   if [[ ! -f "$target/index.html" ]]; then
      rm -rf "$target"
      die "解压后缺 index.html（包内容异常，已清理，current 未变动）"
   fi
   c_ok "解压完成，index.html 存在"

   # ---- 原子切换 current ----
   switch_current "$root" "$rel"
   c_ok "current → releases/$rel"

   # ---- 清理旧版本（保留最新 KEEP_RELEASES 个；-d '\n' 防文件名拆分，-- 防误判参数）----
   (
      cd "$root/releases" &&
         ls -1t | tail -n +$((KEEP_RELEASES + 1)) | xargs -d '\n' -r rm -rf --
   ) || c_warn "旧版本清理失败（不影响本次发布，可手动清理）"
   c_ok "旧版本清理完成（保留 ${KEEP_RELEASES} 个）"

   # ---- 清理 incoming 本次包 ----
   rm -f "$tarball" "${tarball}.sha256"
   c_ok "已清理 incoming 中的 $base"

   echo
   c_ok "发布完成: $app → $rel"
   c_info "验证: 浏览器访问站点确认无白屏/资源 404"
}

# ---------------------------------------------------------------------------
# 子命令: 回滚
# ---------------------------------------------------------------------------
cmd_rollback() {
   local app="$1" rel="${2:-}"
   local root
   root="$(resolve_root "$app")"
   check_root "$root"

   local releases="$root/releases"
   [[ -d "$releases" ]] || die "releases 目录不存在: $releases"

   local cur
   cur="$(current_release "$root")"

   # 未指定版本 → 交互式选择
   if [[ -z "$rel" ]]; then
      c_info "可回滚版本（当前: $cur）:"
      local list
      list=$(ls -1t "$releases")
      local i=1 item mark
      for item in $list; do
         mark=""
         [[ "$item" == "$cur" ]] && mark="   ← 当前"
         echo "  [$i] $item$mark"
         i=$((i + 1))
      done
      read -r -p "输入序号或版本名: " ans
      [[ -n "$ans" ]] || die "未选择"
      if [[ "$ans" =~ ^[0-9]+$ ]]; then
         rel=$(echo "$list" | sed -n "${ans}p")
      else
         rel="$ans"
      fi
      [[ -n "$rel" ]] || die "无效选择: $ans"
   fi

   [[ "$rel" == "$cur" ]] && { c_warn "已是当前版本 $cur，无需回滚"; return 0; }
   [[ -d "$releases/$rel" ]] || die "release 不存在: $rel（status 查看可用版本）"

   if [[ "$DRY_RUN" == "1" ]]; then
      c_info "[DRY-RUN] 回滚计划: current: $cur → $rel（未执行）"
      return 0
   fi

   switch_current "$root" "$rel"
   c_ok "回滚完成: current → releases/$rel（原版本 $cur）"
}

# ---------------------------------------------------------------------------
# 入口（app 在前风格）:
#   ./deploy.sh <app>                     发布（默认动作，取 incoming/ 最新包）
#   ./deploy.sh <app> <tarball 文件名>    发布指定包
#   ./deploy.sh <app> status              查看状态
#   ./deploy.sh <app> rollback [版本名]   回滚
#   ./deploy.sh list-apps                 列出 app 与目录映射
# ---------------------------------------------------------------------------
main() {
   if [[ $# -lt 1 ]]; then
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'   # 打印文件头用法说明
      exit 1
   fi

   # 全局命令（无 app 参数）
   if [[ "$1" == "list-apps" ]]; then
      cmd_list_apps
      return 0
   fi

   local app="$1"
   [[ -n "${APP_DIR[$app]:-}" ]] || die "未知命令或 app: $app（可用命令: list-apps，或 ./deploy.sh <app> [status|rollback]）"

   # 第二参数：子命令保留字（status/rollback）→ 对应操作；其他值 → 视为 tar 包名发布
   local sub="publish" tarball=""
   if [[ $# -ge 2 ]]; then
      case "$2" in
         status | rollback) sub="$2" ;;
         publish) ;; # 显式 publish，等价默认
         *) sub="publish"; tarball="$2" ;;
      esac
   fi

   case "$sub" in
      publish)
         [[ $# -le 2 ]] || die "参数过多: $3（发布只需 app [+ tar包名]）"
         cmd_publish "$app" "$tarball"
         ;;
      status)
         [[ $# -eq 2 ]] || die "用法: ./deploy.sh $app status"
         cmd_status "$app"
         ;;
      rollback)
         [[ $# -le 3 ]] || die "用法: ./deploy.sh $app rollback [版本名]"
         cmd_rollback "$app" "${3:-}"
         ;;
   esac
}

main "$@"
