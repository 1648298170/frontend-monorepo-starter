import { Component, type ErrorInfo, type ReactNode } from "react";

import { AppErrorFallback } from "./AppErrorFallback";
import { errorReporter } from "./error-reporter";
import "./app-error.scss";

// children 是异常边界保护的整个应用组件树。
interface AppErrorBoundaryProps {
  children: ReactNode;
}

// React 类组件异常边界通过 state 决定是否切换到恢复页面。
interface AppErrorBoundaryState {
  hasError: boolean;
}

// React 目前要求使用类组件实现渲染阶段 Error Boundary。
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  // 捕获异常后立即切换 UI，避免用户看到空白页面。
  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  // componentDidCatch 提供组件栈，适合补充监控上下文。
  componentDidCatch(error: Error, info: ErrorInfo) {
    errorReporter.report({
      error,
      source: "react-render",
      context: {
        componentStack: info.componentStack,
        route: window.location.pathname,
      },
    });
  }

  render() {
    // 异常发生后只显示稳定的恢复页，不向用户暴露错误堆栈。
    if (this.state.hasError) {
      return <AppErrorFallback onReload={() => window.location.reload()} />;
    }

    // 正常状态下透明渲染原应用，不改变业务组件层级。
    return this.props.children;
  }
}
