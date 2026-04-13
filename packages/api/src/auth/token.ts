const ACCESS_TOKEN_COOKIE_NAME = "auth_access_token";

/** Read the auth token from the cookie set by the auth app */
export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const name = `${ACCESS_TOKEN_COOKIE_NAME}=`;
  const decoded = decodeURIComponent(document.cookie);
  for (const part of decoded.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name)) {
      return trimmed.slice(name.length).trim() || null;
    }
  }
  return null;
}
