// 导入 Vue Router 原始路由记录类型。
import type { RouteRecordRaw } from "vue-router";

// 导出首页业务域的路由记录数组。
export const homeRoutes: RouteRecordRaw[] = [
  {
    // 将首页挂载在应用根路径。
    path: "/",
    // 提供稳定的路由名称，便于跳转和未来守卫判断。
    name: "home",
    // 仅在进入首页时动态加载 Vue 页面组件。
    component: () => import("@/pages/home/HomePage.vue"),
    // 声明不参与路径匹配的应用路由元信息。
    meta: {
      // 声明首页浏览器标题。
      title: "Home",
      // 首页当前为公开页面，不要求登录。
      requiresAuth: false,
    },
  }, // 首页路由记录结束。
]; // 首页路由数组结束。
