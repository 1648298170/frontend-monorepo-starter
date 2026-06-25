// 导入 Pinia 实例创建函数。
import { createPinia } from "pinia";

// 创建并导出应用唯一的 Pinia 实例，供入口和未来守卫共享。
export const pinia = createPinia();

// 通过稳定入口导出应用级 Store，避免调用方依赖内部文件路径。
export { useAppStore } from "./app.store";
