/**
 * Remove trailing slash from a URL string.
 */
export function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
