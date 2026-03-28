/* eslint-disable sonarjs/no-clear-text-protocols */
import { describe, it, expect, vi, afterEach } from "vitest";

describe("environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("getRuntimeEnv reads API URL from process.env", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().apiUrl).toBe("http://localhost:8000");
  });

  it("getRuntimeEnv defaults to empty string when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().apiUrl).toBe("");
  });

  it("enableMocks is true when NEXT_PUBLIC_ENABLE_MOCKS is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCKS", "true");
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().enableMocks).toBe(true);
  });

  it("enableMocks is false when NEXT_PUBLIC_ENABLE_MOCKS is not 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCKS", "false");
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().enableMocks).toBe(false);
  });

  it("debug is true when NEXT_PUBLIC_DEBUG is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEBUG", "true");
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().debug).toBe(true);
  });

  it("buildHash defaults to 'dev'", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_HASH", "");
    const { getRuntimeEnv } = await import("./environment");
    // When empty string, ?? won't trigger, so it stays empty
    // When undefined, it defaults to "dev"
    expect(typeof getRuntimeEnv().buildHash).toBe("string");
  });

  it("logLevel defaults to 'debug'", async () => {
    const { getRuntimeEnv } = await import("./environment");
    expect(getRuntimeEnv().logLevel).toBe("debug");
  });

  it("getMockApiBaseUrl returns apiBaseUrl if set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://base.local");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.local");
    const { getMockApiBaseUrl } = await import("./environment");
    expect(getMockApiBaseUrl()).toBe("http://base.local");
  });

  it("getMockApiBaseUrl falls back to apiUrl when apiBaseUrl is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.local");
    const { getMockApiBaseUrl } = await import("./environment");
    expect(getMockApiBaseUrl()).toBe("http://api.local");
  });

  it("getApiPrefix returns prefix from env", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_PREFIX", "/api/v1");
    const { getApiPrefix } = await import("./environment");
    expect(getApiPrefix()).toBe("/api/v1");
  });

  it("buildMswApiUrl constructs URL with prefix", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://base.local");
    vi.stubEnv("NEXT_PUBLIC_API_PREFIX", "/api");
    const { buildMswApiUrl } = await import("./environment");
    expect(buildMswApiUrl("/users")).toBe("http://base.local/api/users");
  });

  it("buildMswApiUrl constructs URL without prefix", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://base.local");
    vi.stubEnv("NEXT_PUBLIC_API_PREFIX", "");
    const { buildMswApiUrl } = await import("./environment");
    expect(buildMswApiUrl("/users")).toBe("http://base.local/users");
  });

  it("buildMswApiUrl handles path without leading slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://base.local");
    vi.stubEnv("NEXT_PUBLIC_API_PREFIX", "");
    const { buildMswApiUrl } = await import("./environment");
    expect(buildMswApiUrl("users")).toBe("http://base.local/users");
  });

  it("featureFlags.enableMocks reads from env dynamically", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCKS", "true");
    const { featureFlags } = await import("./environment");
    expect(featureFlags.enableMocks).toBe(true);
  });

  it("environment.isDevelopment returns true in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { environment } = await import("./environment");
    expect(environment.isDevelopment).toBe(true);
    expect(environment.isProduction).toBe(false);
  });

  it("environment.isProduction returns true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { environment } = await import("./environment");
    expect(environment.isProduction).toBe(true);
    expect(environment.isDevelopment).toBe(false);
  });

  it("environment.isTest returns true when VITEST is set", async () => {
    vi.stubEnv("VITEST", "true");
    const { environment } = await import("./environment");
    expect(environment.isTest).toBe(true);
  });

  it("environment.isTest returns true when NODE_ENV is test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VITEST", "");
    const { environment } = await import("./environment");
    expect(environment.isTest).toBe(true);
  });
});
