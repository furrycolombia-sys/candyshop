/**
 * Remove trailing slash from a URL string.
 *
 * Note: This is a local copy because auth cannot depend on shared
 * (shared already depends on auth, which would create a circular dependency).
 */
export function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
