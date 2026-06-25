export class AppConfigError extends Error {
  constructor(
    readonly key: string,
    message: string
  ) {
    super(`Invalid environment variable ${key}: ${message}`);
    this.name = "AppConfigError";
  }
}
