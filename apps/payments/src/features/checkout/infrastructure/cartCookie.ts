import { deleteCookie, getCookie } from "cookies-next";

import { CART_COOKIE_KEY } from "@/features/checkout/domain/constants";
import type { CartItem } from "@/features/checkout/domain/types";

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

/** Clear the cart cookie by expiring it. */
export function clearCartCookie(): void {
  deleteCookie(CART_COOKIE_KEY, { path: "/" });
}
