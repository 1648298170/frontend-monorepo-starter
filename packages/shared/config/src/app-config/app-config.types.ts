export type AppEnvironment =
  | "local"
  | "development"
  | "test"
  | "uat"
  | "production";

export interface AppConfig {
  appName: string;
  apiBaseUrl: string;
  environment: AppEnvironment;
}

export interface RuntimeEnv {
  MODE?: string;
  VITE_APP_ENV?: string;
  VITE_APP_NAME?: string;
  VITE_API_BASE_URL?: string;
}
