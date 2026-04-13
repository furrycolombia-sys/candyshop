export function getApiBasePath(): string {
  if (globalThis.window === undefined) return "";
  return globalThis.window.location.pathname.startsWith("/admin")
    ? "/admin"
    : "";
}
