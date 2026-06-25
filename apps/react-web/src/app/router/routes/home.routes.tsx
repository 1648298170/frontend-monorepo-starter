// 导入 React Router 路由记录类型。
import type { RouteObject } from "react-router-dom";

// 导入应用约定的 handle 元信息类型。
import type { AppRouteHandle } from "../route-meta";

// 导出首页业务域的路由记录数组。
export const homeRoutes = [
  {
    // 将首页挂载在应用根路径。
    path: "/",
    // 使用 handle 携带不参与 URL 匹配的应用路由元信息。
    handle: {
      // 声明首页浏览器标题。
      title: "Home",
      // 首页当前为公开页面，不要求登录。
      requiresAuth: false,
    } satisfies AppRouteHandle, // 校验元信息字段符合应用路由契约。
    // 使用 React Router lazy 实现页面级动态导入和独立 chunk。
    lazy: async () => {
      // 仅在用户进入首页时加载页面模块。
      const { HomePage } = await import("@/pages/home/HomePage");

      // 将命名导出的页面组件映射为 React Router 需要的 Component。
      return { Component: HomePage };
    }, // 首页懒加载函数结束。
  }, // 首页路由记录结束。
] satisfies RouteObject[]; // 校验整个数组符合 React Router 路由记录类型。
