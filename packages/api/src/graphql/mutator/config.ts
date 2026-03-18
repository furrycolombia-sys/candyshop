/** API timeout in milliseconds */
export const API_TIMEOUT = 30_000;

/** Message used when cancelling requests */
export const API_CANCEL_MESSAGE = "Request cancelled";

/** Max characters before truncating error messages in logs */
export const ERROR_TRUNCATION_LENGTH = 200;

/** Default error message when no specific message is available */
export const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred";

/** Check if running in test environment */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}
