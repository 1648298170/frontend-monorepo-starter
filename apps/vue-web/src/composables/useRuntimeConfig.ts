import { runtimeServices } from "@/app/runtime/runtime-services";

// Vue Composable 暴露应用启动时创建的服务单例，不重复创建配置和客户端。
export function useRuntimeConfig() {
  return runtimeServices;
}
