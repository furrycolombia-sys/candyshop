import { AUTH_COOKIE_NAMES } from "../domain";

const REFRESH_ENDPOINT = "/api/auth/refresh";

let accessToken: string | null = null;

/**
 * Read access token from cookie (client-side only).
 * Only works when the cookie is readable (not httpOnly). Used by API client to send Bearer token.
 */
export function getAccessTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const name = `${AUTH_COOKIE_NAMES.accessToken}=`;
  const decoded = decodeURIComponent(document.cookie);
  const parts = decoded.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name)) {
      return trimmed.slice(name.length) || null;
    }
  }
  return null;
}

function normalizeAuthHostUrl(authHostUrl: string): string {
  return authHostUrl.endsWith("/") ? authHostUrl.slice(0, -1) : authHostUrl;
}

function buildRefreshUrl(authHostUrl: string): string {
  return `${normalizeAuthHostUrl(authHostUrl)}${REFRESH_ENDPOINT}`;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(nextToken: string | null): void {
  accessToken = nextToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function hydrateAccessTokenFromRefresh(input?: {
  authHostUrl?: string;
}): Promise<boolean> {
  const authHostUrl = input?.authHostUrl ?? "/auth";

  try {
    const response = await fetch(buildRefreshUrl(authHostUrl), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      clearAccessToken();
      return false;
    }

    const payload = (await response.json()) as {
      accessToken?: unknown;
    };
    const token =
      typeof payload.accessToken === "string" ? payload.accessToken : null;

    if (!token) {
      clearAccessToken();
      return false;
    }

    setAccessToken(token);
    return true;
  } catch {
    clearAccessToken();
    return false;
  }
}
