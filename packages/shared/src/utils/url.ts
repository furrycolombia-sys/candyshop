/**
 * Remove trailing slash from a URL string.
 */
export function stripTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end--;
  return end === url.length ? url : url.slice(0, end);
}
