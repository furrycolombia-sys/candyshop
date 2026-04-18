import { isCartCookieItems, type CartCookieItem } from "shared/types";

/** Validates that parsed cookie data is an array of {id, quantity}. */
export function isValidCartItems(data: unknown): data is CartCookieItem[] {
  return isCartCookieItems(data);
}
