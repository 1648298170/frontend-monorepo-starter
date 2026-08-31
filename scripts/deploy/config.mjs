import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** 支持部署的 app 列表（与 apps/* 目录名一一对应） */
const SUPPORTED_APPS = ["vue-web", "react-web"];

// 支持部署的环境（local 仅本地开发不部署；所有环境统一走 release 版本化管线）
const SUPPORTED_ENVS = ["test", "uat", "production"];

const REQUIRED_FIELDS = [
  "host",
  "port",
  "user",
  "sshKeyPath",
  "deployPath",
  "outDir",
  "buildCmd",
];

export function loadConfig(
  configPath = resolve(process.cwd(), "deploy.config.json")
) {
  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `deploy.config.json 不存在。请先复制模板：cp deploy.config.example.json deploy.config.json`
      );
    }
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`deploy.config.json JSON 解析失败：${error.message}`);
  }
}

export function validateTarget(config, app, env) {
  if (!SUPPORTED_APPS.includes(app)) {
    throw new Error(`不支持的 app: ${app}。支持: ${SUPPORTED_APPS.join(", ")}`);
  }
  if (!SUPPORTED_ENVS.includes(env)) {
    throw new Error(`不支持的 env: ${env}。支持: ${SUPPORTED_ENVS.join(", ")}`);
  }
  const appCfg = config[app];
  if (!appCfg) {
    throw new Error(`deploy.config.json 缺少 app 配置: "${app}"`);
  }
  const envCfg = appCfg[env];
  if (!envCfg) {
    throw new Error(`deploy.config.json 缺少 ${app}.${env} 配置`);
  }
  const missing = REQUIRED_FIELDS.filter((k) => !envCfg[k]);
  if (missing.length > 0) {
    throw new Error(`${app}.${env} 缺少配置字段: ${missing.join(", ")}`);
  }
  if (typeof envCfg.port !== "number") {
    throw new Error(`${app}.${env}.port 必须是数字`);
  }
  return envCfg;
}

export const constants = {
  SUPPORTED_APPS,
  SUPPORTED_ENVS,
};
