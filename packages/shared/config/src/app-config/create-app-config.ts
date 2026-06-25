import { AppConfigError } from "./app-config-error";
import type { AppConfig, AppEnvironment, RuntimeEnv } from "./app-config.types";

export function createAppConfig(env: RuntimeEnv): AppConfig {
  const appName = readNonEmptyString(
    "VITE_APP_NAME",
    env.VITE_APP_NAME,
    "Frontend App"
  );
  const apiBaseUrl = readNonEmptyString(
    "VITE_API_BASE_URL",
    env.VITE_API_BASE_URL,
    "/api"
  );

  validateApiBaseUrl(apiBaseUrl);

  return {
    appName,
    apiBaseUrl,
    environment: normalizeEnvironment(env.VITE_APP_ENV ?? env.MODE),
  };
}

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  if (
    value === "local" ||
    value === "development" ||
    value === "test" ||
    value === "uat" ||
    value === "production"
  ) {
    return value;
  }

  return "local";
}

function readNonEmptyString(
  key: string,
  value: string | undefined,
  fallback: string
) {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new AppConfigError(key, "must not be empty");
  }

  return normalizedValue;
}

function validateApiBaseUrl(value: string) {
  if (value.startsWith("/") || URL.canParse(value)) {
    return;
  }

  throw new AppConfigError(
    "VITE_API_BASE_URL",
    'must be an absolute URL or start with "/"'
  );
}
