// 导入 React 严格模式，帮助开发阶段发现不安全副作用。
import { StrictMode } from "react";
// 导入 React 19 浏览器根节点创建函数。
import { createRoot } from "react-dom/client";
// 导入 React Router 的路由上下文提供组件。
import { RouterProvider } from "react-router-dom";

// 导入应用唯一的路由实例。
import { router } from "./app/router";
// 导入应用最外层异常边界，避免未捕获渲染错误导致空白页面。
import { AppErrorBoundary } from "./app/error-handling/AppErrorBoundary";
// 导入 Tailwind CSS 4 样式入口。
import "./styles/tailwind.css";
// 导入应用级 Sass 样式入口。
import "./styles/main.scss";

// 在 HTML 根节点上创建 React 应用根实例并开始渲染。
createRoot(document.getElementById("root")!).render(
  // 开发阶段启用严格模式检查。
  <StrictMode>
    {/* 捕获路由系统之外的 React 渲染异常并展示统一恢复页面。 */}
    <AppErrorBoundary>
      {/* 将路由实例注入组件树，并由路由系统负责页面渲染。 */}
      <RouterProvider router={router} />
    </AppErrorBoundary>
  </StrictMode> // React 严格模式边界结束。
); // React 应用挂载结束。
