import { deleteCookie, getCookie, setCookie } from "cookies-next";

import {
  permCacheSchema,
  PERM_COOKIE_KEY,
  PERM_COOKIE_MAX_BYTES,
} from "../constants";

const PERM_MAX_AGE = 3600;
const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;

function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;
  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}

function getPermCookieOptions() {
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

export function readPermCache(): string[] | null {
  try {
    const raw = getCookie(PERM_COOKIE_KEY);
    if (raw === undefined || raw === null) return null;
    const result = permCacheSchema.safeParse(JSON.parse(String(raw)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writePermCache(keys: string[]): void {
  const serialised = JSON.stringify(keys);
  if (serialised.length > PERM_COOKIE_MAX_BYTES) {
    // Exceeding the limit would silently truncate or be rejected by the browser;
    // skip the write so we fall back to a fresh DB fetch on next navigation.
    return;
  }
  const options = getPermCookieOptions();
  if (options.domain) {
    deleteCookie(PERM_COOKIE_KEY, { path: "/" });
  }
  setCookie(PERM_COOKIE_KEY, serialised, {
    ...options,
    maxAge: PERM_MAX_AGE,
  });
}

export function clearPermCache(): void {
  const options = getPermCookieOptions();
  deleteCookie(PERM_COOKIE_KEY, options);
  if (options.domain !== undefined) {
    deleteCookie(PERM_COOKIE_KEY, { path: "/" });
  }
}
