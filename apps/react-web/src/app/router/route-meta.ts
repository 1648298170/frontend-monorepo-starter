// 定义 React Router handle 中允许使用的应用级路由元信息。
export interface AppRouteHandle {
  // 页面标题，由应用外壳统一写入 document.title。
  title?: string;
  // 标识页面未来是否需要登录，目前仅作为稳定契约预留。
  requiresAuth?: boolean;
  // 声明页面未来需要的权限编码列表。
  permissions?: string[];
} // 应用路由元信息接口结束。
