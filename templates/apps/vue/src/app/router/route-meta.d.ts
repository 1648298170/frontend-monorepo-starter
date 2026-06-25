// 导入 Vue Router 模块，使下面的声明合并作用于现有类型。
import "vue-router";

// 将本声明文件标记为模块，避免类型扩展污染全局脚本作用域。
export {};

// 通过模块声明合并扩展 Vue Router 的 RouteMeta。
declare module "vue-router" {
  // 定义应用允许在路由 meta 中声明的字段。
  interface RouteMeta {
    // 页面标题，由全局导航守卫统一写入 document.title。
    title?: string;
    // 标识页面未来是否需要登录，目前仅作为稳定契约预留。
    requiresAuth?: boolean;
    // 声明页面未来需要的权限编码列表。
    permissions?: string[];
  } // RouteMeta 类型扩展结束。
} // Vue Router 模块声明结束。
