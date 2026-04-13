import type { CartItem } from "@/features/cart/domain/types";

export function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  // Check the essential fields — the rest comes from the full product row
  return (
    typeof record.id === "string" &&
    typeof record.price_usd === "number" &&
    typeof record.quantity === "number"
  );
}

/** Validates that parsed cookie data is an array of cart items with required fields */
export function isValidCartItems(data: unknown): data is CartItem[] {
  return Array.isArray(data) && data.every((item) => isValidCartItem(item));
}
