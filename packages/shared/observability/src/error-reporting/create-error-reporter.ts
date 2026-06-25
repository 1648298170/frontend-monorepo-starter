import type {
  ErrorReport,
  ErrorReporter,
  ErrorReportInput,
} from "./error-reporter.types";
import { normalizeError } from "./normalize-error";

// 将多个平台适配器组合成应用唯一的错误上报入口。
export function createErrorReporter(
  reporters: ReadonlyArray<(report: ErrorReport) => void>
): ErrorReporter {
  return {
    report(input: ErrorReportInput) {
      // 在分发前统一补全标准 Error 和发生时间。
      const report: ErrorReport = {
        ...input,
        error: normalizeError(input.error),
        timestamp: new Date().toISOString(),
      };

      // 各适配器相互隔离，一个平台故障不能阻断其他平台或应用运行。
      for (const reporter of reporters) {
        try {
          reporter(report);
        } catch (reportingError) {
          console.error("Error reporter failed", reportingError);
        }
      }
    },
  };
}
