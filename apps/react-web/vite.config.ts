// 导入 Node.js URL 到文件路径的转换工具，以及标准 URL 构造函数。
import { fileURLToPath, URL } from "node:url";

// 导入 Tailwind CSS 4 的 Vite 插件。
import tailwindcss from "@tailwindcss/vite";
// 导入 React 官方 Vite 插件，提供 JSX 转换和 Fast Refresh。
import react from "@vitejs/plugin-react";
// 导入构建产物可视化插件，仅在分析构建时启用。
import { visualizer } from "rollup-plugin-visualizer";
// 导入 Vite 配置辅助函数和环境变量加载函数。
import { defineConfig, loadEnv } from "vite";

// 计算 React 应用根目录，确保环境文件和输出路径不依赖命令执行目录。
const appRoot = fileURLToPath(new URL(".", import.meta.url));
// 定义注入所有 SCSS 文件的公共 Sass 能力入口，该文件只能导出变量、函数和 mixin。
const sassAbstracts = '@use "@/styles/abstracts/index.scss" as *;';

// 导出根据当前 Vite mode 动态生成的应用配置。
export default defineConfig(({ mode }) => {
  // 从应用根目录加载 .env 和当前 mode 对应的环境文件，并允许读取非 VITE_ 变量。
  const env = loadEnv(mode, appRoot, "");
  // 根据当前环境变量创建可选的本地开发代理配置。
  const proxy = createProxyConfig(env);
  // 仅在分析命令显式开启时生成 bundle 可视化报告。
  const shouldAnalyze = parseBoolean(env.BUILD_ANALYZE);

  // 返回 React 应用最终使用的 Vite 配置。
  return {
    // 注册 React、Tailwind 和按需启用的构建分析插件。
    plugins: [
      // 启用 React JSX 转换和开发阶段 Fast Refresh。
      react(),
      // 启用 Tailwind CSS 4 的扫描、转换和热更新能力。
      tailwindcss(),
      // BUILD_ANALYZE 不为 true 时返回 false，Vite 会忽略该插件项。
      shouldAnalyze &&
        // 生成包含模块体积、gzip 和 brotli 大小的静态分析报告。
        visualizer({
          // 在分析报告中计算 Brotli 压缩体积。
          brotliSize: true,
          // 将报告输出到仓库级 reports 目录，避免混入应用发布产物。
          filename: fileURLToPath(
            // 使用独立的 React 文件名，便于同时保留两套应用的分析结果。
            new URL("../../reports/bundle/react.html", import.meta.url)
          ),
          // 在分析报告中计算 gzip 压缩体积。
          gzipSize: true,
          // 构建完成后不自动打开浏览器，适配本地和 CI 环境。
          open: false,
        }),
    ],
    // 配置源码模块的解析方式。
    resolve: {
      // 声明应用内部使用的路径别名。
      alias: {
        // 将 @ 统一映射到当前应用的 src 目录。
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    // 配置 CSS 和预处理器行为。
    css: {
      // 声明各类 CSS 预处理器的编译选项。
      preprocessorOptions: {
        // 配置 SCSS 编译器。
        scss: {
          // 使用 Sass 现代编译器 API，避免旧 API 的弃用行为。
          api: "modern-compiler",
          // 自动注入公共 Sass 能力，使组件样式无需重复 @use。
          additionalData: sassAbstracts,
        },
      },
    },
    // 配置开发服务器，仅影响 vite serve，不影响生产部署服务器。
    server: {
      // 从公共 .env 读取监听地址，默认模板值允许局域网访问。
      host: env.DEV_SERVER_HOST,
      // 根据环境变量决定启动服务后是否自动打开浏览器。
      open: parseBoolean(env.DEV_SERVER_OPEN),
      // 读取并校验 React 开发服务器端口。
      port: parseDevServerPort(env.DEV_SERVER_PORT),
      // development 配置目标地址时启用代理，其他环境默认关闭。
      proxy,
      // 端口被占用时直接报错，避免静默切换端口造成联调混乱。
      strictPort: true,
    },
    // 配置生产构建行为。
    build: {
      // 开启时生成 hidden sourcemap，供错误监控平台上传且不公开引用。
      sourcemap: parseBoolean(env.BUILD_SOURCEMAP) ? "hidden" : false,
      // 使用 Vite 8 的 Rolldown 原生配置入口。
      rolldownOptions: {
        // 配置 Rolldown 的产物输出策略。
        output: {
          // 将 React 核心、路由和状态库拆分，降低单个 vendor 的下载与失效范围。
          manualChunks(id) {
            // React Router 更新频率和使用范围与 React 核心不同，单独缓存。
            if (id.includes("node_modules/react-router")) {
              return "react-router";
            }

            // Zustand 及其外部 Store 订阅依赖形成独立状态管理缓存块。
            if (
              id.includes("node_modules/zustand/") ||
              id.includes("node_modules/use-sync-external-store/")
            ) {
              return "react-state";
            }

            // React、React DOM 和 scheduler 作为最稳定的核心运行时缓存。
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-core";
            }
          },
        },
      },
    },
  };
});

// 根据环境变量创建 Vite 开发服务器代理配置。
function createProxyConfig(env: Record<string, string>) {
  // 读取前端请求使用的代理前缀，例如 /api。
  const prefix = env.DEV_PROXY_PREFIX;
  // 读取本地开发后端目标地址，例如 http://localhost:3000。
  const target = env.DEV_PROXY_TARGET;

  // 任一代理参数缺失时关闭代理，避免测试和生产模式误用本地目标。
  if (!prefix || !target) {
    // undefined 表示不向 Vite server 注册 proxy 配置。
    return undefined;
  }

  // 要求代理前缀是站内绝对路径，避免生成不可预测的匹配规则。
  if (!prefix.startsWith("/")) {
    // 在配置解析阶段中断启动并给出明确修复信息。
    throw new Error('DEV_PROXY_PREFIX must start with "/".');
  }

  // 要求代理目标是可解析的绝对 URL。
  if (!URL.canParse(target)) {
    // 在请求发生前暴露错误的后端目标配置。
    throw new Error("DEV_PROXY_TARGET must be an absolute URL.");
  }

  // 返回 Vite server.proxy 接受的路径映射对象。
  return {
    // 使用环境变量中的前缀作为动态代理规则键。
    [prefix]: {
      // 修改请求 Host 头以匹配代理目标，兼容常见后端服务。
      changeOrigin: true,
      // 将请求转发到当前 mode 配置的后端地址。
      target,
      // 转发前移除代理前缀，例如 /api/users 转换为 /users。
      rewrite: (path: string) =>
        // 仅处理确实以前缀开头的路径，防止意外改写。
        path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path,
    },
  };
}

// 将环境变量中的严格字符串布尔值转换为 boolean。
function parseBoolean(value: string | undefined) {
  // 只有字符串 true 开启能力，其他值全部按 false 处理。
  return value === "true";
}

// 解析并校验 Vite 开发服务器端口。
function parseDevServerPort(value: string | undefined) {
  // 将环境变量字符串转换为 JavaScript 数字。
  const port = Number(value);

  // 端口必须是 1 到 65535 之间的整数。
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    // 在开发服务器启动前抛出可理解的配置错误。
    throw new Error("DEV_SERVER_PORT must be an integer between 1 and 65535.");
  }

  // 返回已经校验、可安全传给 Vite 的端口值。
  return port;
}
