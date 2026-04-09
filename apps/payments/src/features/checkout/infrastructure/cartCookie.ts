import { deleteCookie, getCookie } from "cookies-next";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  CART_COOKIE_CHANGED_EVENT,
  CART_COOKIE_KEY,
} from "@/shared/domain/constants";

const EMPTY_CART: CartItem[] = [];
const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;

let lastRawCartCookie: string | null = null;
let lastCartSnapshot: CartItem[] = EMPTY_CART;

function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;

  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}

function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.price_cop === "number" &&
    typeof record.price_usd === "number" &&
    typeof record.quantity === "number"
  );
}

/** Read and validate the cart cookie set by the store app. */
export function readCartFromCookie(): CartItem[] {
  const raw = getCookie(CART_COOKIE_KEY);
  if (raw) {
    const serialized = String(raw);
    if (serialized === lastRawCartCookie) {
      return lastCartSnapshot;
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        lastRawCartCookie = serialized;
        lastCartSnapshot = EMPTY_CART;
        return EMPTY_CART;
      }

      lastRawCartCookie = serialized;
      lastCartSnapshot = parsed.filter((item: unknown) =>
        isValidCartItem(item),
      );
      return lastCartSnapshot;
    } catch {
      lastRawCartCookie = serialized;
      lastCartSnapshot = EMPTY_CART;
      return EMPTY_CART;
    }
  } else {
    lastRawCartCookie = null;
    lastCartSnapshot = EMPTY_CART;
    return EMPTY_CART;
  }
}

function notifyCartCookieChanged(): void {
  if (globalThis.window !== undefined) {
    globalThis.window.dispatchEvent(new Event(CART_COOKIE_CHANGED_EVENT));
  }
}

/** Subscribe to cookie changes via local events and page visibility/focus refreshes. */
export function subscribeToCartCookie(onStoreChange: () => void): () => void {
  if (globalThis.window === undefined) {
    return () => {};
  }

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      onStoreChange();
    }
  };

  globalThis.window.addEventListener(CART_COOKIE_CHANGED_EVENT, onStoreChange);
  globalThis.window.addEventListener("focus", onStoreChange);
  globalThis.document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    globalThis.window.removeEventListener(
      CART_COOKIE_CHANGED_EVENT,
      onStoreChange,
    );
    globalThis.window.removeEventListener("focus", onStoreChange);
    globalThis.document.removeEventListener(
      "visibilitychange",
      handleVisibility,
    );
  };
}

/** Clear the cart cookie by expiring it. */
export function clearCartCookie(): void {
  let sharedDomain: string | undefined;
  if (globalThis.window !== undefined) {
    sharedDomain = getSharedCookieDomain(globalThis.location.hostname);
  }

  deleteCookie(CART_COOKIE_KEY, {
    path: "/",
    ...(sharedDomain ? { domain: sharedDomain } : {}),
  });
  notifyCartCookieChanged();
}
