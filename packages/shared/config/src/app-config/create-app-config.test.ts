import { describe, expect, it } from "vitest";

import { AppConfigError } from "./app-config-error";
import { createAppConfig } from "./create-app-config";

describe("createAppConfig", () => {
  it("uses defaults for missing environment values", () => {
    expect(createAppConfig({})).toEqual({
      appName: "Frontend App",
      apiBaseUrl: "/api",
      environment: "local",
    });
  });

  it("normalizes configured values", () => {
    expect(
      createAppConfig({
        MODE: "production",
        VITE_APP_NAME: " Admin Console ",
        VITE_API_BASE_URL: "https://api.example.com",
      })
    ).toEqual({
      appName: "Admin Console",
      apiBaseUrl: "https://api.example.com",
      environment: "production",
    });
  });

  it.each(["test", "uat"] as const)(
    "preserves the %s test environment",
    (environment) => {
      expect(createAppConfig({ MODE: environment }).environment).toBe(
        environment
      );
    }
  );

  it("uses the explicit application environment before the Vite mode", () => {
    expect(
      createAppConfig({
        MODE: "development",
        VITE_APP_ENV: "local",
      }).environment
    ).toBe("local");
  });

  it("falls back to local for unknown environments", () => {
    expect(createAppConfig({ MODE: "preview" }).environment).toBe("local");
  });

  it("rejects invalid API base URLs", () => {
    expect(() =>
      createAppConfig({ VITE_API_BASE_URL: "api.example.com" })
    ).toThrow(AppConfigError);
  });
});
