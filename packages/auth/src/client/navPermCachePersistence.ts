import { deleteCookie, getCookie, setCookie } from "cookies-next";

const NAV_PERM_COOKIE_KEY = "candystore-nav-perm";
const NAV_PERM_MAX_AGE = 3600;
const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;

function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;
  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}

function getNavPermCookieOptions() {
  const isSecure =
    globalThis.window !== undefined &&
    globalThis.location.protocol === "https:";
  let sharedDomain: string | undefined;
  if (globalThis.window !== undefined) {
    sharedDomain = getSharedCookieDomain(globalThis.location.hostname);
  }

  return {
    path: "/",
    ...(sharedDomain ? { domain: sharedDomain } : {}),
    sameSite: "lax" as const,
    secure: isSecure,
  };
}

export function readNavPermCache(): string[] | null {
  try {
    const raw = getCookie(NAV_PERM_COOKIE_KEY);
    if (raw === undefined || raw === null) return null;
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((item) => typeof item === "string")) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

export function writeNavPermCache(keys: string[]): void {
  const options = getNavPermCookieOptions();
  if (options.domain) {
    deleteCookie(NAV_PERM_COOKIE_KEY, { path: "/" });
  }
  setCookie(NAV_PERM_COOKIE_KEY, JSON.stringify(keys), {
    ...options,
    maxAge: NAV_PERM_MAX_AGE,
  });
}

export function clearNavPermCache(): void {
  const options = getNavPermCookieOptions();
  deleteCookie(NAV_PERM_COOKIE_KEY, options);
  if (options.domain !== undefined) {
    deleteCookie(NAV_PERM_COOKIE_KEY, { path: "/" });
  }
}
