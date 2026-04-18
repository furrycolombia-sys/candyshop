const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;

/**
 * Returns the shared root domain (e.g. `.example.com`) suitable for setting
 * a cross-subdomain cookie. Returns `undefined` for localhost or single-segment
 * hostnames where a shared domain is not applicable.
 */
export function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;

  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}
