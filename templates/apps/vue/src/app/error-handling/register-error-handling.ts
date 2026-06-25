import type { App } from "vue";
import type { Router } from "vue-router";

import { errorReporter } from "./error-reporter";

// 集中注册 Vue 和 Vue Router 的全局异常入口，main.ts 只负责调用。
export function registerErrorHandling(app: App, router: Router) {
  // 捕获未被局部 onErrorCaptured 处理的组件和生命周期异常。
  app.config.errorHandler = (error, _instance, info) => {
    errorReporter.report({
      error,
      source: "vue-global",
      context: {
        componentInfo: info,
        route: router.currentRoute.value.fullPath,
      },
    });
  };

  // 捕获导航守卫、异步路由组件加载等路由系统异常。
  router.onError((error, to) => {
    errorReporter.report({
      error,
      source: "vue-router",
      context: {
        route: to.fullPath,
      },
    });
  });
}
