<script setup lang="ts">
import { onErrorCaptured, shallowRef } from "vue";

import AppErrorFallback from "./AppErrorFallback.vue";
import { errorReporter } from "./error-reporter";

// 只保存是否发生异常，具体错误信息交给 reporter，不进入响应式状态。
const hasError = shallowRef(false);

// 捕获当前插槽组件树中的渲染和生命周期异常。
onErrorCaptured((error, _instance, info) => {
  // 先切换到恢复页面，避免故障组件继续参与后续渲染。
  hasError.value = true;
  errorReporter.report({
    error,
    source: "vue-render",
    context: {
      componentInfo: info,
      route: window.location.pathname,
    },
  });

  // 返回 false 阻止同一错误继续向上传播，避免重复上报。
  return false;
});

// 当前模板采用整页刷新恢复，后续也可替换为重新初始化局部模块。
function reloadApplication() {
  window.location.reload();
}
</script>

<template>
  <!-- 异常时展示稳定恢复页，正常时透明渲染原插槽内容。 -->
  <AppErrorFallback v-if="hasError" @reload="reloadApplication" />
  <slot v-else />
</template>
