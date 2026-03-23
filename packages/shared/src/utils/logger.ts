type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerEnvironment {
  isDevelopment: boolean;
  nodeEnv: string;
  debug: boolean;
  logLevel: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, getEnv: () => LoggerEnvironment): boolean {
  const env = getEnv();
  const enabled = env.isDevelopment || env.nodeEnv === "test" || env.debug;
  if (!enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[env.logLevel as LogLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export function createLogger(getEnv: () => LoggerEnvironment) {
  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog("debug", getEnv))
        // eslint-disable-next-line no-console -- logger utility
        console.debug(formatMessage("debug", message), ...args);
    },
    info(message: string, ...args: unknown[]): void {
      if (shouldLog("info", getEnv))
        // eslint-disable-next-line no-console -- logger utility
        console.info(formatMessage("info", message), ...args);
    },
    warn(message: string, ...args: unknown[]): void {
      if (shouldLog("warn", getEnv))
        console.warn(formatMessage("warn", message), ...args);
    },
    error(message: string, ...args: unknown[]): void {
      if (shouldLog("error", getEnv))
        console.error(formatMessage("error", message), ...args);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
