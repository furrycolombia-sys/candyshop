import { deleteCookie, setCookie } from "cookies-next";
import { CART_COOKIE_KEY, getSharedCookieDomain } from "shared";
import {
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
} from "shared/constants/time";
import type { CartCookieItem } from "shared/types";

import type { CartItem } from "@/features/cart/domain/types";

const DAYS = 30;
/** Cookie lives for 30 days */
export const COOKIE_MAX_AGE_S =
  DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

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
  const cookieItems: CartCookieItem[] = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
  }));

  if (cookieOptions.domain) {
    deleteCookie(CART_COOKIE_KEY, { path: "/" });
  }

  setCookie(CART_COOKIE_KEY, JSON.stringify(cookieItems), {
    ...cookieOptions,
    maxAge: COOKIE_MAX_AGE_S,
  });
}

export function removeCartCookie() {
  const cookieOptions = getCartCookieOptions();
  deleteCookie(CART_COOKIE_KEY, cookieOptions);

  if (cookieOptions.domain !== undefined) {
    deleteCookie(CART_COOKIE_KEY, { path: "/" });
  }
}

export { CART_COOKIE_KEY as COOKIE_KEY, getSharedCookieDomain } from "shared";
