import {
  environment,
  getRuntimeEnv,
} from "@/shared/infrastructure/config/environment";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const env = getRuntimeEnv();
  const enabled =
    environment.isDevelopment || env.nodeEnv === "test" || env.debug;
  if (!enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[env.logLevel as LogLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog("debug"))
      console.debug(formatMessage("debug", message), ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog("info"))
      console.info(formatMessage("info", message), ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog("warn"))
      console.warn(formatMessage("warn", message), ...args);
  },
  error(message: string, ...args: unknown[]): void {
    if (shouldLog("error"))
      console.error(formatMessage("error", message), ...args);
  },
};
