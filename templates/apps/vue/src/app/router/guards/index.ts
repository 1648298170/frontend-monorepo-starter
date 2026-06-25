// 导入 Vue Router 实例类型。
import type { Router } from "vue-router";

// 集中注册应用级导航守卫，避免守卫逻辑散落在入口文件。
export function registerRouterGuards(router: Router) {
  // 在每次导航确认前处理路由元信息。
  router.beforeEach((to) => {
    // 仅在目标路由声明标题时更新浏览器标题。
    if (to.meta.title) {
      // 将类型化的路由标题写入浏览器文档。
      document.title = to.meta.title;
    } // 标题存在判断结束。
  }); // 全局前置守卫注册结束。
} // 路由守卫注册函数结束。
