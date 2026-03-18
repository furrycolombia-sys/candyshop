/** API timeout in milliseconds */
export const API_TIMEOUT = 30_000;

/** Message used when cancelling requests */
export const API_CANCEL_MESSAGE = "Request cancelled";

/** Max characters before truncating error messages in logs */
export const ERROR_TRUNCATION_LENGTH = 100;

/** Placeholder for redacted sensitive values in logs */
export const REDACTED_PLACEHOLDER = "[REDACTED]";

/** Default error message when no specific message is available */
export const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred";

/** Fields that may contain sensitive data and should not be logged */
export const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "api_key",
  "apiKey",
  "authorization",
  "credentials",
  "ssn",
  "credit_card",
  "creditCard",
  "cvv",
];

/** Query params that may contain sensitive data */
export const SENSITIVE_PARAMS = ["token", "key", "secret", "password", "auth"];

/** Check if running in test environment */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

/** Get API base URL from environment */
export function getApiBaseUrl(): string {
  // If NEXT_PUBLIC_API_BASE_URL is explicitly set (even if empty string), use it
  if (process.env.NEXT_PUBLIC_API_BASE_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to empty string for relative URLs (works with Next.js rewrites)
  // When baseURL is empty, Axios will use relative URLs that work with Next.js rewrites
  return "";
}
