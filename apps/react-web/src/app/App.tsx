// 导入 React 副作用 Hook，用于同步浏览器页面标题。
import { useEffect } from "react";
// 导入嵌套路由出口和当前匹配路由读取 Hook。
import { Outlet, useMatches } from "react-router-dom";

// 导入应用统一的路由元信息类型。
import type { AppRouteHandle } from "./router/route-meta";

// 定义 React 应用外壳组件，负责承载路由出口和应用级路由副作用。
export function App() {
  // 获取从根路由到当前页面的全部匹配记录。
  const matches = useMatches();

  // 在路由匹配结果变化后同步浏览器标题。
  useEffect(() => {
    // 从最深层路由向上寻找第一个声明了标题的路由元信息。
    const routeTitle = [...matches]
      // 反转副本，确保子路由标题优先于父路由标题。
      .reverse()
      // 将 React Router 的未知 handle 收窄为应用路由元信息。
      .map((match) => match.handle as AppRouteHandle | undefined)
      // 找到第一个包含 title 的 handle，并读取标题值。
      .find((handle) => handle?.title)?.title;

    // 仅在路由明确声明标题时更新 document.title。
    if (routeTitle) {
      // 将当前页面标题写入浏览器文档。
      document.title = routeTitle;
    } // 标题存在判断结束。
  }, [matches]); // 路由匹配变化时重新执行标题同步。

  // 渲染当前匹配到的子路由页面。
  return <Outlet />;
} // App 组件定义结束。
