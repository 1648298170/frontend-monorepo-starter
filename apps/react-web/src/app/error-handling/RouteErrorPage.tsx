import { useEffect } from "react";
import { useLocation, useRouteError } from "react-router-dom";

import { normalizeError } from "@repo/observability";

import { AppErrorFallback } from "./AppErrorFallback";
import { errorReporter } from "./error-reporter";
import "./app-error.scss";

// 处理 React Router 管理范围内的 loader、action、lazy 和路由渲染异常。
export function RouteErrorPage() {
  // 获取路由系统捕获的原始异常以及发生异常时的地址。
  const routeError = useRouteError();
  const location = useLocation();

  // 页面挂载或错误变化时统一上报，避免在 render 阶段执行副作用。
  useEffect(() => {
    errorReporter.report({
      error: normalizeError(routeError),
      source: "react-router",
      context: {
        route: location.pathname,
      },
    });
  }, [location.pathname, routeError]);

  // 路由异常与普通渲染异常复用同一恢复界面。
  return <AppErrorFallback onReload={() => window.location.reload()} />;
}
