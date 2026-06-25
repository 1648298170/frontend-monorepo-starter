import { runtimeServices } from "@/app/runtime/runtime-services";

// React Hook 暴露应用启动时创建的服务单例，组件调用不会创建新客户端。
export function useRuntimeConfig() {
  return runtimeServices;
}
