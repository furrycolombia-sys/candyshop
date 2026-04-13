/**
 * Remove trailing slash from a URL string.
 *
 * Note: This is a local copy because auth cannot depend on shared
 * (shared already depends on auth, which would create a circular dependency).
 */
export function stripTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end--;
  return end === url.length ? url : url.slice(0, end);
}
