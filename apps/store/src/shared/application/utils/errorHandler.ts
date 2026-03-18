export interface ApiError {
  detail?: Array<{ msg: string }>;
}

export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== "object" || error === null) return false;
  if (!("detail" in error)) return false;
  const detail = (error as ApiError).detail;
  return detail === undefined || Array.isArray(detail);
}

export const ERROR_MESSAGES = {
  GENERIC: "error.generic",
  API_REQUEST: "error.apiRequest",
} as const;

export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return ERROR_MESSAGES.GENERIC;
}
