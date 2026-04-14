import { deleteCookie, setCookie } from "cookies-next";

import type { CartItem } from "@/features/cart/domain/types";

export const COOKIE_KEY = "candystore-cart";
const DAYS = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;
/** Cookie lives for 30 days */
export const COOKIE_MAX_AGE_S =
  DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

export function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;

  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}

export function getCartCookieOptions() {
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

export function persistCartCookie(items: CartItem[]) {
  const cookieOptions = getCartCookieOptions();

  if (cookieOptions.domain) {
    deleteCookie(COOKIE_KEY, { path: "/" });
  }

  setCookie(COOKIE_KEY, JSON.stringify(items), {
    ...cookieOptions,
    maxAge: COOKIE_MAX_AGE_S,
  });
}

export function removeCartCookie() {
  const cookieOptions = getCartCookieOptions();
  deleteCookie(COOKIE_KEY, cookieOptions);

  if (cookieOptions.domain !== undefined) {
    deleteCookie(COOKIE_KEY, { path: "/" });
  }
}
