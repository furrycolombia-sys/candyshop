/**
 * Environment Configuration
 *
 * Centralized snapshot of environment variables.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
const DEFAULT_LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "/";
const DEFAULT_AUTH_HOST_URL =
  process.env.NEXT_PUBLIC_AUTH_HOST_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "/auth");

type RuntimeEnv = {
  apiUrl: string;
  apiBaseUrl: string;
  apiPrefix: string;
  enableMocks: boolean;
  appName: string;
  debug: boolean;
  logLevel: LogLevel;
  nodeEnv: string;
  vitest: string;
  buildHash: string;
  landingUrl: string;
  authHostUrl: string;
};

function readRuntimeEnv() {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    apiPrefix: process.env.NEXT_PUBLIC_API_PREFIX ?? "",
    enableMocks: process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true",
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "",
    debug: process.env.NEXT_PUBLIC_DEBUG === "true",
    logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "debug",
    nodeEnv: process.env.NODE_ENV ?? "",
    vitest: process.env.VITEST ?? "",
    buildHash: process.env.NEXT_PUBLIC_BUILD_HASH ?? "dev",
    landingUrl: DEFAULT_LANDING_URL,
    authHostUrl: DEFAULT_AUTH_HOST_URL,
  } as RuntimeEnv;
}

let runtimeEnv = readRuntimeEnv();

export function getRuntimeEnv(): RuntimeEnv {
  runtimeEnv = readRuntimeEnv();
  return runtimeEnv;
}

export function getMockApiBaseUrl(): string {
  const env = getRuntimeEnv();
  return env.apiBaseUrl || env.apiUrl || "";
}

export function getApiPrefix(): string {
  return getRuntimeEnv().apiPrefix || "";
}

export function buildMswApiUrl(path: string): string {
  const baseUrl = getMockApiBaseUrl();
  const prefix = getApiPrefix();
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (prefix) {
    return `${baseUrl}${prefix}/${cleanPath}`;
  }
  return `${baseUrl}/${cleanPath}`;
}

export const featureFlags = {
  get enableMocks(): boolean {
    return getRuntimeEnv().enableMocks;
  },
};

export const environment = {
  get isDevelopment(): boolean {
    return getRuntimeEnv().nodeEnv === "development";
  },
  get isProduction(): boolean {
    return getRuntimeEnv().nodeEnv === "production";
  },
  get isTest(): boolean {
    const env = getRuntimeEnv();
    return env.nodeEnv === "test" || env.vitest === "true";
  },
};

export { runtimeEnv };
