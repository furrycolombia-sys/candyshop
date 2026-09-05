/**
 * Whether a request skips locale handling entirely.
 *
 * Kept in its own module, free of any Next import, so the rule can be tested
 * without pulling the middleware runtime into the test graph. Seven apps run
 * this on every request.
 *
 * `/api/` is matched with its trailing slash. `startsWith("/api")` also
 * matched `/apiary` and any other route whose first segment merely begins with
 * those four letters, which would have silently skipped locale routing for it.
 *
 * `includes(".")` is the static-asset test and is deliberately loose. It
 * catches `/logo.png` and `/favicon.ico`, and it also catches any route
 * segment containing a dot — but product URLs are built with `slugify()`,
 * which replaces every character outside `[a-z0-9]` with a hyphen, so no link
 * this app generates can contain one. A hand-typed dotted path under a
 * locale-prefixed route still resolves, because the locale is already there
 * and Next.js matches it without the middleware's help.
 *
 * @param pathname - the request path, without query string.
 * @returns true when the proxy should stand aside.
 */
export function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  );
}
