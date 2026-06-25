import type { ErrorReport } from "./error-reporter.types";

// 默认控制台适配器适用于本地开发，生产环境可继续组合远程监控适配器。
export function consoleErrorReporter(report: ErrorReport) {
  console.error(`[${report.source}]`, report.error, report.context ?? {});
}
