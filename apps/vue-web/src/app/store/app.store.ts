// 导入 Pinia 的 Store 定义函数。
import { defineStore } from "pinia";
// 导入浅层响应式引用，基础布尔值无需深层代理。
import { shallowRef } from "vue";

// 定义应用外壳级 Pinia Store；业务状态应放入对应 feature Store。
export const useAppStore = defineStore("app", () => {
  // 创建侧边栏展开状态，并默认保持展开。
  const sidebarOpen = shallowRef(true);

  // 显式设置侧边栏展开状态。
  function setSidebarOpen(open: boolean) {
    // 更新 Pinia 管理的响应式状态。
    sidebarOpen.value = open;
  } // setSidebarOpen Action 定义结束。

  // 在展开和收起状态之间切换侧边栏。
  function toggleSidebar() {
    // 基于当前值执行布尔取反。
    sidebarOpen.value = !sidebarOpen.value;
  } // toggleSidebar Action 定义结束。

  // 返回全部响应式状态和 Action，确保 DevTools 与插件能够识别。
  return {
    // 暴露侧边栏状态供组件订阅。
    sidebarOpen,
    // 暴露显式设置 Action。
    setSidebarOpen,
    // 暴露状态切换 Action。
    toggleSidebar,
  };
}); // 应用级 Pinia Store 定义结束。
