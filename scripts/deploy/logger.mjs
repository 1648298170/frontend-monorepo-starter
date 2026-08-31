// 统一彩色日志输出，带 ISO 时间戳 + 单行 spinner（loading）支持。
//
// spinner 设计要点：
// - 仅交互式终端（TTY）渲染帧动画；CI / 管道 / 重定向自动降级为零开销（start/update/stop 均为 no-op）
// - SHIP_SPINNER=1 可强制开启（调试用）
// - spinner 活跃期间，logger 任何输出先清 spinner 行再打印、随后重绘（日志避让，防止画面错乱）
// - 刻意不用 \x1b[?25l 隐藏光标：异常退出路径可能来不及恢复，会把用户终端光标"吃掉"
// - 清行用 \r + 空格填充（而非 \x1b[2K），兼容不支持该序列的老终端
// - 定时器 unref()：任何失败路径都不会被 spinner 挂住进程
const RESET = "\x1b[0m";
const COLORS = {
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const LEVELS = {
  DEBUG: { color: COLORS.gray, label: "DEBUG" },
  INFO: { color: COLORS.cyan, label: "INFO" },
  WARN: { color: COLORS.yellow, label: "WARN" },
  ERROR: { color: COLORS.red, label: "ERROR" },
  OK: { color: COLORS.green, label: "OK" },
};

// ---------------------------------------------------------------------------
// 单行 spinner
// ---------------------------------------------------------------------------
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** 终端能力判定：非 TTY（CI/管道/重定向）或 dumb 终端下不渲染 */
const SPINNER_SUPPORTED =
  (!!process.stdout.isTTY || process.env.SHIP_SPINNER === "1") &&
  !process.env.CI &&
  process.env.TERM !== "dumb";

const spinnerState = {
  active: false,
  frameIdx: 0,
  text: "",
  timer: null,
  lastLineLen: 0,
};

/** 覆盖式清除当前行 */
function clearSpinnerLine() {
  if (spinnerState.lastLineLen > 0) {
    process.stdout.write(`\r${" ".repeat(spinnerState.lastLineLen)}\r`);
    spinnerState.lastLineLen = 0;
  }
}

/** 渲染一帧（\r 回行首重写） */
function renderSpinner() {
  if (!SPINNER_SUPPORTED || !spinnerState.active) return;
  const frame = FRAMES[spinnerState.frameIdx % FRAMES.length];
  spinnerState.frameIdx += 1;
  const line = `${frame} ${spinnerState.text}`;
  // +1 余量：防止帧字符宽度差异留下残尾
  spinnerState.lastLineLen = line.length + 1;
  process.stdout.write(`\r${line}`);
}

export const spinner = {
  /** 是否具备渲染条件（调用方据此降级，如改打逐秒日志） */
  get supported() {
    return SPINNER_SUPPORTED;
  },
  start(text = "") {
    if (!SPINNER_SUPPORTED) return;
    if (spinnerState.active) {
      spinnerState.text = text;
      return;
    }
    spinnerState.active = true;
    spinnerState.text = text;
    spinnerState.frameIdx = 0;
    renderSpinner();
    spinnerState.timer = setInterval(renderSpinner, 100);
    spinnerState.timer.unref();
  },
  update(text) {
    if (!SPINNER_SUPPORTED) return;
    spinnerState.text = text;
    renderSpinner();
  },
  /** 停止并把该行落定为成功/失败结果（非 TTY 下退化为普通日志行） */
  succeed(msg) {
    this.stop();
    write(console.log, "OK", msg);
  },
  fail(msg) {
    this.stop();
    write(console.error, "ERROR", msg);
  },
  stop() {
    if (spinnerState.timer) {
      clearInterval(spinnerState.timer);
      spinnerState.timer = null;
    }
    if (spinnerState.active) {
      clearSpinnerLine();
      spinnerState.active = false;
    }
  },
};

// ---------------------------------------------------------------------------
// logger
// ---------------------------------------------------------------------------

function formatTimestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function formatLine(level, msg) {
  const { color, label } = LEVELS[level];
  const ts = `${COLORS.gray}${formatTimestamp()}${RESET}`;
  const tag = `${color}${label.padEnd(5)}${RESET}`;
  return `${ts} ${tag} ${msg}`;
}

/** 带 spinner 避让的输出：清行 → 打日志 → 重绘 */
function write(stream, level, msg) {
  const wasActive = spinnerState.active;
  if (wasActive) clearSpinnerLine();
  stream(formatLine(level, msg));
  if (wasActive) renderSpinner();
}

export const logger = {
  debug(msg) {
    if (process.env.DEBUG) write(console.log, "DEBUG", msg);
  },
  info(msg) {
    write(console.log, "INFO", msg);
  },
  warn(msg) {
    write(console.warn, "WARN", msg);
  },
  error(msg) {
    write(console.error, "ERROR", msg);
  },
  success(msg) {
    write(console.log, "OK", msg);
  },
  /** 原始行输出（子进程 stderr 透传等），同样参与 spinner 避让 */
  raw(msg) {
    const wasActive = spinnerState.active;
    if (wasActive) clearSpinnerLine();
    process.stderr.write(msg.endsWith("\n") ? msg : `${msg}\n`);
    if (wasActive) renderSpinner();
  },
  blank() {
    const wasActive = spinnerState.active;
    if (wasActive) clearSpinnerLine();
    console.log();
    if (wasActive) renderSpinner();
  },
};
