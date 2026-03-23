// Shared utility functions
// Add utilities that are used by multiple apps here

export { tid, TID_ATTR } from "./tid";
export type { TidOptionProps } from "./tid";

export { formatDate, formatDateTime, formatRelativeTime } from "./dateUtils";
export type { DateFormatStyle } from "./dateUtils";

export { isApiError, getErrorMessage, ERROR_MESSAGES } from "./errorHandler";
export type { ApiError } from "./errorHandler";

export { createLogger } from "./logger";
export type { Logger, LoggerEnvironment } from "./logger";

export { stripTrailingSlash } from "./url";
