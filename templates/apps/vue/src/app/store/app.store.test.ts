import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from ".";

// Pinia Store 单元测试直接调用 Store 和 Action，不需要挂载 Vue 组件。
describe("useAppStore", () => {
  // 每个测试使用全新的 Pinia 实例，保证状态、订阅和插件上下文完全隔离。
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // 验证 Store 首次创建时的默认状态。
  it("initializes with the sidebar open", () => {
    const store = useAppStore();

    expect(store.sidebarOpen).toBe(true);
  });

  // 使用真实 Action 验证状态更新，而不是直接修改内部 ref。
  it("updates the sidebar through store actions", () => {
    const store = useAppStore();

    store.setSidebarOpen(false);
    expect(store.sidebarOpen).toBe(false);

    store.toggleSidebar();
    expect(store.sidebarOpen).toBe(true);
  });
});
