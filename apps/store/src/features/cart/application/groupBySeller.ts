import type { CartItem, SellerGroup } from "@/features/cart/domain/types";

/** Group cart items by seller_id, calculating subtotal per group */
export function groupCartBySeller(items: CartItem[]): SellerGroup[] {
  const groups = new Map<string, CartItem[]>();

  for (const item of items) {
    const sellerId = item.seller_id ?? "unknown";
    const existing = groups.get(sellerId) ?? [];
    existing.push(item);
    groups.set(sellerId, existing);
  }

  return [...groups.entries()].map(([sellerId, groupItems]) => ({
    sellerId,
    items: groupItems,
    subtotal: groupItems.reduce(
      (sum, item) => sum + item.price_usd * item.quantity,
      0,
    ),
  }));
}
