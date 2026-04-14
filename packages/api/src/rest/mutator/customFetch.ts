import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";

// eslint-disable-next-line no-restricted-imports -- relative import needed for cross-package typecheck compatibility
import { getTokenFromCookie } from "../../auth/token";

import {
  API_CANCEL_MESSAGE,
  API_TIMEOUT,
  DEFAULT_ERROR_MESSAGE,
  ERROR_TRUNCATION_LENGTH,
  REDACTED_PLACEHOLDER,
  SENSITIVE_FIELDS,
  SENSITIVE_PARAMS,
  getApiBaseUrl,
  isTestEnvironment,
} from "./config";
import type { ApiError } from "./types";

export type AccessTokenGetter =
  | (() => string | null | Promise<string | null>)
  | null;

let accessTokenGetter: AccessTokenGetter = null;

export function setAccessTokenGetter(getter: AccessTokenGetter): void {
  accessTokenGetter = getter;
}

export type OnUnauthorized = (() => void | Promise<void>) | null;
let onUnauthorized: OnUnauthorized = null;
export function setOnUnauthorized(handler: OnUnauthorized): void {
  onUnauthorized = handler;
}

export type OnForbidden = (() => void | Promise<void>) | null;
let onForbidden: OnForbidden = null;
export function setOnForbidden(handler: OnForbidden): void {
  onForbidden = handler;
}

/** When 401, try this first; if it returns true, the request is retried with the new token. */
export type RefreshTokenCallback = (() => Promise<boolean>) | null;
let refreshTokenCallback: RefreshTokenCallback = null;
export function setRefreshTokenCallback(callback: RefreshTokenCallback): void {
  refreshTokenCallback = callback;
}

const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;

// Create axios instance with same config as httpClient
const axiosInstance = Axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

async function tryRefreshAndRetry(error: AxiosError): Promise<unknown> {
  const status = error.response?.status;
  const config = error.config;
  if (status !== HTTP_STATUS_UNAUTHORIZED || !config || !refreshTokenCallback) {
    return null;
  }
  const refreshed = await refreshTokenCallback();
  if (!refreshed) return null;
  const fromGetter =
    accessTokenGetter === null
      ? null
      : await Promise.resolve(accessTokenGetter());
  const token =
    typeof fromGetter === "string" && fromGetter.length > 0
      ? fromGetter
      : getTokenFromCookie();
  if (typeof token !== "string" || token.length === 0) return null;
  const headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
  return axiosInstance.request({ ...config, headers });
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const retried = await tryRefreshAndRetry(error);
    if (retried !== null) return retried;

    if (status === HTTP_STATUS_UNAUTHORIZED && onUnauthorized) {
      await Promise.resolve(onUnauthorized());
    }
    if (status === HTTP_STATUS_FORBIDDEN && onForbidden) {
      await Promise.resolve(onForbidden());
    }
    throw error;
  },
);

/**
 * Sanitizes URLs to remove potentially sensitive query parameters.
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, "http://localhost");
    for (const param of SENSITIVE_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, REDACTED_PLACEHOLDER);
      }
    }
    return urlObj.pathname + urlObj.search;
  } catch {
    // If URL parsing fails, return a safe version
    return url.split("?")[0] + "?[params-redacted]";
  }
}

/**
 * Sanitizes error data to remove potentially sensitive information before logging.
 * This prevents accidental exposure of tokens, passwords, or PII in console logs.
 */
function sanitizeErrorData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  // For strings, check if it looks like sensitive data
  if (typeof data === "string") {
    return data.length > ERROR_TRUNCATION_LENGTH
      ? `${data.slice(0, ERROR_TRUNCATION_LENGTH)}...[truncated]`
      : data;
  }

  // For arrays, recursively sanitize each item
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeErrorData(item));
  }

  // For objects, filter out sensitive fields
  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      sanitized[key] = SENSITIVE_FIELDS.some((field) =>
        lowerKey.includes(field),
      )
        ? REDACTED_PLACEHOLDER
        : sanitizeErrorData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Handle API errors consistently
 */
function logAxiosError(
  error: AxiosError,
  url: string,
  isNetworkError: boolean,
  isTimeoutError: boolean,
  isTestEnv: boolean,
) {
  if (isTestEnv) return;

  const safeUrl = sanitizeUrl(url);

  if (isNetworkError) {
    console.error(`[Orval] Network error - cannot reach API: ${safeUrl}`);
    return;
  }

  if (isTimeoutError) {
    console.error(`[Orval] Request timeout: ${safeUrl}`);
    return;
  }

  if (error.response) {
    // Sanitize error data to avoid logging sensitive information
    const sanitizedData = sanitizeErrorData(error.response.data);
    console.error("[Orval] API error:", {
      url: safeUrl,
      status: error.response.status,
      data: sanitizedData,
    });
    return;
  }

  console.error(
    "[Orval] Request error:",
    sanitizeErrorData(error.message) || "Unknown error",
  );
}

function getApiErrorMessage(
  error: AxiosError,
  isNetworkError: boolean,
  isTimeoutError: boolean,
): string {
  if (isNetworkError) {
    return "Unable to connect to the server. Please check your connection.";
  }

  if (isTimeoutError) {
    return "Request timed out. Please try again.";
  }

  if (error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    return (data.message as string) || (data.detail as string) || error.message;
  }

  if (error.message) {
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGE;
}

function handleError(error: AxiosError | Error | unknown): ApiError {
  // Silently handle request cancellations — these are expected (component
  // unmount, filter change, React Strict Mode double-invoke, etc.)
  if (Axios.isCancel(error)) {
    return { message: API_CANCEL_MESSAGE, code: "ERR_CANCELED" };
  }

  // Only log errors in non-test environments to keep test output clean
  const isTestEnv = isTestEnvironment();

  // Handle non-Axios errors
  if (!Axios.isAxiosError(error)) {
    const message =
      error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;
    if (!isTestEnv) {
      console.error("[Orval] Non-Axios error:", sanitizeErrorData(message));
    }
    return { message };
  }

  // Determine error type for better messaging
  const isNetworkError = !error.response && !!error.request;
  const isTimeoutError = error.code === "ECONNABORTED";
  const url = error.config?.url || "unknown";

  logAxiosError(error, url, isNetworkError, isTimeoutError, isTestEnv);

  // Build user-friendly error message
  const message = getApiErrorMessage(error, isNetworkError, isTimeoutError);

  return {
    message,
    status: error.response?.status,
    code: error.code,
  };
}

/**
 * Custom fetch function for Orval
 *
 * @template T - Expected response type
 * @param config - Axios request configuration from Orval
 * @param options - Additional options (can override config)
 * @returns Promise resolving to the transformed response data
 */
export const customFetch = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  let token: string | null =
    accessTokenGetter === null
      ? null
      : await Promise.resolve(accessTokenGetter());
  if (token == null || token.length === 0) {
    token = getTokenFromCookie();
  }

  const authHeader =
    typeof token === "string" && token.length > 0
      ? { Authorization: `Bearer ${token}` }
      : {};

  const mergedConfig: AxiosRequestConfig = {
    ...config,
    ...options,
    headers: {
      ...config.headers,
      ...options?.headers,
      ...authHeader,
    },
  };

  // Create cancel token for request cancellation support
  const source = Axios.CancelToken.source();

  const promise = axiosInstance
    .request<{ success: boolean; data: T } | T>({
      ...mergedConfig,
      cancelToken: source.token,
    })
    .then((response) => {
      // Handle { success, data } wrapper from backend
      const responseData = response.data;

      // Check if response has our wrapper format
      if (
        responseData &&
        typeof responseData === "object" &&
        "success" in responseData &&
        "data" in responseData
      ) {
        // Extract data from wrapper - return as-is to match generated types
        return (responseData as { success: boolean; data: T }).data;
      }

      // If no wrapper, return as-is
      return responseData as T;
    })
    .catch((error: unknown) => {
      // Silently re-throw cancellations — expected when components unmount
      // or React Strict Mode fires the double-invoke lifecycle in dev.
      if (Axios.isCancel(error)) {
        throw { message: API_CANCEL_MESSAGE, code: "ERR_CANCELED" } as ApiError;
      }
      // Transform all other errors to our ApiError format
      throw handleError(error);
    });

  // Attach cancel method to promise for React Query cancellation
  // @ts-expect-error - Adding cancel method to promise
  promise.cancel = () => {
    source.cancel(API_CANCEL_MESSAGE);
  };

  return promise;
};
