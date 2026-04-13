// eslint-disable-next-line no-restricted-imports -- relative import needed for cross-package typecheck compatibility
import { getTokenFromCookie } from "../../auth/token";

import {
  API_CANCEL_MESSAGE,
  API_TIMEOUT,
  DEFAULT_ERROR_MESSAGE,
  ERROR_TRUNCATION_LENGTH,
  isTestEnvironment,
} from "./config";
import type { GraphqlApiError } from "./types";

/**
 * GraphQL Custom Fetcher for @graphql-codegen/typescript-react-query
 *
 * Mirrors the patterns from the REST customFetch.ts (Orval mutator):
 * - Consistent error handling (transforms to GraphqlApiError)
 * - Request cancellation via AbortController
 * - Environment-aware logging (silent in tests)
 *
 * Key differences from REST customFetch:
 * - Uses native fetch() instead of Axios
 * - POSTs to a single /graphql endpoint with { query, variables }
 * - Handles standard GraphQL { data, errors } response format
 *   (NOT the REST { success, data } envelope)
 */

/** Get GraphQL endpoint URL from environment */
function getGraphqlUrl(): string {
  if (process.env.NEXT_PUBLIC_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_URL;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl + "/graphql";
  }
  return "/graphql";
}

/** Handle GraphQL-level errors from the response body */
function handleGraphqlErrors(
  errors: Array<{ message: string; locations?: unknown[]; path?: string[] }>,
): GraphqlApiError {
  const firstError = errors[0];
  const message = errors.map((e) => e.message).join("; ");

  if (!isTestEnvironment()) {
    console.error("[GraphQL] Query errors:", { count: errors.length, message });
  }

  return {
    message,
    locations: firstError?.locations as GraphqlApiError["locations"],
    path: firstError?.path,
  };
}

/** Handle HTTP-level errors (network, timeout, non-200 status) */
function handleHttpError(error: unknown): GraphqlApiError {
  const isTestEnv = isTestEnvironment();

  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: API_CANCEL_MESSAGE, code: "ABORTED" };
  }

  if (error instanceof TypeError) {
    // Network errors (fetch throws TypeError for network failures)
    if (!isTestEnv) {
      console.error("[GraphQL] Network error - cannot reach API");
    }
    return {
      message: "Unable to connect to the server. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  }

  if (error instanceof Error) {
    if (!isTestEnv) {
      console.error("[GraphQL] Request error:", error.message);
    }
    return { message: error.message };
  }

  return { message: DEFAULT_ERROR_MESSAGE };
}

/**
 * Custom fetcher for graphql-codegen generated hooks.
 *
 * @graphql-codegen/typescript-react-query calls this function with
 * (query, variables) for each operation. It returns a function that
 * React Query can call (and cancel).
 */
export function graphqlFetch<TData, TVariables extends Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  options?: RequestInit["headers"],
): () => Promise<TData> {
  return async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const token = getTokenFromCookie();
      const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(getGraphqlUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...(options as Record<string, string>),
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        if (!isTestEnvironment()) {
          console.error("[GraphQL] HTTP error:", {
            status: response.status,
            body:
              errorBody.length > ERROR_TRUNCATION_LENGTH
                ? errorBody.slice(0, ERROR_TRUNCATION_LENGTH) + "...[truncated]"
                : errorBody,
          });
        }
        throw {
          message: `GraphQL request failed with status ${response.status}`,
          status: response.status,
        } satisfies GraphqlApiError;
      }

      const json = (await response.json()) as {
        data?: TData;
        errors?: Array<{
          message: string;
          locations?: unknown[];
          path?: string[];
        }>;
      };

      // GraphQL can return both data and errors
      if (json.errors && json.errors.length > 0) {
        throw handleGraphqlErrors(json.errors);
      }

      if (json.data === undefined) {
        throw {
          message: "GraphQL response missing data field",
        } satisfies GraphqlApiError;
      }

      return json.data;
    } catch (error) {
      // Re-throw GraphqlApiError as-is
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        !(error instanceof Error)
      ) {
        throw error;
      }
      throw handleHttpError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
