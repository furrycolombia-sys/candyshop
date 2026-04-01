import { deleteCookie, getCookie } from "cookies-next";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  CART_COOKIE_CHANGED_EVENT,
  CART_COOKIE_KEY,
} from "@/shared/domain/constants";

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
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => isValidCartItem(item));
  } catch {
    return [];
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
  deleteCookie(CART_COOKIE_KEY, { path: "/" });
  notifyCartCookieChanged();
}
