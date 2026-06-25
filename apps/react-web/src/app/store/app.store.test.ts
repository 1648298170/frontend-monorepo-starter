import { beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from ".";

// Zustand Store 单元测试直接操作 Store API，不需要渲染 React 组件。
describe("useAppStore", () => {
  // Zustand Store 是模块级单例，每个测试前都恢复默认值，避免用例相互污染。
  beforeEach(() => {
    useAppStore.setState({ sidebarOpen: true });
  });

  // 验证新进入应用时的默认状态，这是页面布局依赖的基础契约。
  it("initializes with the sidebar open", () => {
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  // 通过真实 Action 修改状态，验证显式设置和切换行为。
  it("updates the sidebar through store actions", () => {
    const { setSidebarOpen, toggleSidebar } = useAppStore.getState();

    setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);

    toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });
});
