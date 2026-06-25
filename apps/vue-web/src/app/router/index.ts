// 导入 Vue Router 实例和 HTML5 History 模式创建函数。
import { createRouter, createWebHistory } from "vue-router";

// 导入首页业务域维护的路由记录。
import { homeRoutes } from "./routes/home.routes";

// 创建并导出应用唯一的 Vue Router 实例。
export const router = createRouter({
  // 使用浏览器 History API，生产服务器需要配置 SPA 回退。
  history: createWebHistory(),
  // 组合各业务域路由；新增模块时继续追加对应 routes 数组。
  routes: homeRoutes,
}); // Vue Router 实例创建结束。
