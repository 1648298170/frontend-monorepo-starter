// 导入 React Router 的浏览器路由实例创建函数。
import { createBrowserRouter } from "react-router-dom";

// 导入应用外壳，作为所有业务页面的父级路由组件。
import { App } from "../App";
// 导入路由加载、Action 或渲染失败时使用的统一错误页面。
import { RouteErrorPage } from "../error-handling/RouteErrorPage";
// 导入首页业务域维护的路由记录。
import { homeRoutes } from "./routes/home.routes";

// 创建并导出应用唯一的浏览器路由实例。
export const router = createBrowserRouter([
  {
    // 使用应用外壳承载全局布局、标题同步和嵌套路由出口。
    element: <App />,
    // 捕获 React Router 管理范围内的路由错误并提供恢复入口。
    errorElement: <RouteErrorPage />,
    // 组合各业务域路由；新增模块时继续追加对应 routes 数组。
    children: homeRoutes,
  }, // 根路由记录结束。
]); // 浏览器路由实例创建结束。
