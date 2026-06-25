// 框架或业务层提交的原始错误信息，error 可以是任意捕获值。
export interface ErrorReportInput {
  error: unknown;
  source: string;
  context?: Record<string, unknown>;
}

// 分发给平台适配器前的标准错误结构。
export interface ErrorReport extends ErrorReportInput {
  error: Error;
  timestamp: string;
}

// 应用只依赖该接口，不直接依赖 Sentry 等具体监控 SDK。
export interface ErrorReporter {
  report(input: ErrorReportInput): void;
}
