import { TOKEN_TTL_SECONDS } from "../domain";

export const AUTH_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Evaluate secure flag lazily (per-request) so runtime env vars
 * like AUTH_COOKIES_SECURE are respected in Docker containers
 * where NODE_ENV=production but cookies must work over HTTP.
 */
function resolveSecure(): boolean {
  if (process.env.AUTH_COOKIES_SECURE === "false") return false;
  if (process.env.AUTH_COOKIES_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function createCookieOptions(maxAge: number) {
  return {
    ...AUTH_COOKIE_BASE_OPTIONS,
    secure: resolveSecure(),
    maxAge,
  };
}

export function createSessionCookieOptions() {
  return {
    ...AUTH_COOKIE_BASE_OPTIONS,
    secure: resolveSecure(),
  };
}

/**
 * Access token cookie options: NOT httpOnly so JS can read it across all apps
 * on the same domain (port is not part of cookie domain matching per RFC 6265).
 * The refresh token stays httpOnly for security.
 */
export function createAccessTokenCookieOptions(maxAge: number) {
  return {
    ...AUTH_COOKIE_BASE_OPTIONS,
    httpOnly: false,
    secure: resolveSecure(),
    maxAge,
  };
}

export function createAccessTokenSessionCookieOptions() {
  return {
    ...AUTH_COOKIE_BASE_OPTIONS,
    httpOnly: false,
    secure: resolveSecure(),
  };
}

export const AUTH_COOKIE_MAX_AGE = {
  accessToken: TOKEN_TTL_SECONDS.access,
  refreshToken: TOKEN_TTL_SECONDS.refresh,
} as const;

export { AUTH_COOKIE_NAMES } from "../domain";
