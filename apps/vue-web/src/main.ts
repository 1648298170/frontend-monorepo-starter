// 导入 Vue 应用实例创建函数。
import { createApp } from "vue";

// 导入应用根组件。
import App from "./app/App.vue";
// 导入应用唯一的 Vue Router 实例。
import { router } from "./app/router";
// 导入 Vue 组件与路由异常的统一注册函数。
import { registerErrorHandling } from "./app/error-handling/register-error-handling";
// 导入应用级导航守卫注册函数。
import { registerRouterGuards } from "./app/router/guards";
// 导入应用唯一的 Pinia 实例。
import { pinia } from "./app/store";
// 导入 Tailwind CSS 4 样式入口。
import "./styles/tailwind.css";
// 导入应用级 Sass 样式入口。
import "./styles/main.scss";

// 创建 Vue 应用实例，插件安装和挂载统一在入口完成。
const app = createApp(App);

// 在插件和组件开始运行前注册全局异常上报入口。
registerErrorHandling(app, router);
// 优先安装 Pinia，确保后续路由守卫可以安全访问 Store。
app.use(pinia);
// 在 Router 安装前集中注册标题、鉴权等全局守卫。
registerRouterGuards(router);
// 安装 Vue Router，为组件树提供路由上下文。
app.use(router);
// 将完成初始化的 Vue 应用挂载到 HTML 根节点。
app.mount("#app");
