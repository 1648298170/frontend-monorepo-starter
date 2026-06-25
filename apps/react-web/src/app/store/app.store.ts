// 导入 Zustand 的 Store 创建函数。
import { create } from "zustand";

// 定义应用外壳级状态和允许组件调用的 Action。
interface AppState {
  // 表示应用侧边栏当前是否展开。
  sidebarOpen: boolean;
  // 显式设置侧边栏展开状态。
  setSidebarOpen: (open: boolean) => void;
  // 在展开和收起状态之间切换侧边栏。
  toggleSidebar: () => void;
} // 应用 Store 类型定义结束。

// 创建应用级 Zustand Store；业务状态应放入对应 feature Store。
export const useAppStore = create<AppState>((set) => ({
  // 默认展开侧边栏。
  sidebarOpen: true,
  // 使用传入值替换侧边栏状态。
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  // 基于前一个状态安全切换侧边栏。
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
})); // 应用级 Zustand Store 创建结束。
