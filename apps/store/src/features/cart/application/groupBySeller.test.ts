import { describe, it, expect } from "vitest";

import { groupCartBySeller } from "@/features/cart/application/groupBySeller";
import type { CartItem } from "@/features/cart/domain/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCartItem(
  overrides: Partial<CartItem> & {
    id: string;
    price_usd: number;
    quantity: number;
  },
): CartItem {
  return {
    slug: "test-slug",
    name_en: "Test Product",
    name_es: "Producto de Prueba",
    description_en: "",
    description_es: "",
    type: "merch",
    category: "merch",
    price_cop: 0,
    max_quantity: null,
    is_active: true,
    created_at: "2025-01-01",
    event_id: null,
    long_description_en: "",
    long_description_es: "",
    tagline_en: "",
    tagline_es: "",
    compare_at_price_cop: null,
    compare_at_price_usd: null,
    tags: [],
    rating: null,
    review_count: 0,
    images: [],
    sections: [],
    updated_at: "2025-01-01",
    featured: false,
    seller_id: null,
    refundable: null,
    sort_order: 0,
    ...overrides,
  } as CartItem;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("groupCartBySeller", () => {
  it("returns empty array for empty cart", () => {
    expect(groupCartBySeller([])).toEqual([]);
  });

  it("groups all items under one seller", () => {
    const items = [
      makeCartItem({
        id: "1",
        price_usd: 10,
        quantity: 2,
        seller_id: "seller-a",
      }),
      makeCartItem({
        id: "2",
        price_usd: 5,
        quantity: 1,
        seller_id: "seller-a",
      }),
    ];

    const result = groupCartBySeller(items);

    expect(result).toHaveLength(1);
    expect(result[0].sellerId).toBe("seller-a");
    expect(result[0].items).toHaveLength(2);
    expect(result[0].subtotal).toBe(10 * 2 + 5 * 1);
  });

  it("groups items by different sellers", () => {
    const items = [
      makeCartItem({
        id: "1",
        price_usd: 10,
        quantity: 1,
        seller_id: "seller-a",
      }),
      makeCartItem({
        id: "2",
        price_usd: 20,
        quantity: 2,
        seller_id: "seller-b",
      }),
      makeCartItem({
        id: "3",
        price_usd: 5,
        quantity: 3,
        seller_id: "seller-a",
      }),
    ];

    const result = groupCartBySeller(items);

    expect(result).toHaveLength(2);

    const groupA = result.find((g) => g.sellerId === "seller-a");
    const groupB = result.find((g) => g.sellerId === "seller-b");

    expect(groupA).toBeDefined();
    expect(groupA!.items).toHaveLength(2);
    expect(groupA!.subtotal).toBe(10 * 1 + 5 * 3);

    expect(groupB).toBeDefined();
    expect(groupB!.items).toHaveLength(1);
    expect(groupB!.subtotal).toBe(20 * 2);
  });

  it("groups items with no seller_id under 'unknown'", () => {
    const items = [
      makeCartItem({ id: "1", price_usd: 10, quantity: 1, seller_id: null }),
      makeCartItem({ id: "2", price_usd: 15, quantity: 2 }), // defaults to null via makeCartItem
    ];

    const result = groupCartBySeller(items);

    expect(result).toHaveLength(1);
    expect(result[0].sellerId).toBe("unknown");
    expect(result[0].items).toHaveLength(2);
    expect(result[0].subtotal).toBe(10 * 1 + 15 * 2);
  });

  it("mixes known sellers with unknown seller_id", () => {
    const items = [
      makeCartItem({
        id: "1",
        price_usd: 10,
        quantity: 1,
        seller_id: "seller-a",
      }),
      makeCartItem({ id: "2", price_usd: 20, quantity: 1, seller_id: null }),
      makeCartItem({
        id: "3",
        price_usd: 30,
        quantity: 1,
        seller_id: "seller-a",
      }),
    ];

    const result = groupCartBySeller(items);

    expect(result).toHaveLength(2);

    const sellerA = result.find((g) => g.sellerId === "seller-a");
    const unknown = result.find((g) => g.sellerId === "unknown");

    expect(sellerA!.subtotal).toBe(10 + 30);
    expect(unknown!.subtotal).toBe(20);
  });

  it("calculates subtotals correctly with fractional prices", () => {
    const items = [
      makeCartItem({ id: "1", price_usd: 9.99, quantity: 3, seller_id: "s1" }),
    ];

    const result = groupCartBySeller(items);

    expect(result[0].subtotal).toBeCloseTo(29.97, 2);
  });

  it("handles single item cart", () => {
    const items = [
      makeCartItem({
        id: "1",
        price_usd: 42,
        quantity: 1,
        seller_id: "seller-x",
      }),
    ];

    const result = groupCartBySeller(items);

    expect(result).toHaveLength(1);
    expect(result[0].sellerId).toBe("seller-x");
    expect(result[0].items).toHaveLength(1);
    expect(result[0].subtotal).toBe(42);
  });

  it("preserves item order within each group", () => {
    const items = [
      makeCartItem({ id: "first", price_usd: 1, quantity: 1, seller_id: "s1" }),
      makeCartItem({
        id: "second",
        price_usd: 2,
        quantity: 1,
        seller_id: "s1",
      }),
      makeCartItem({ id: "third", price_usd: 3, quantity: 1, seller_id: "s1" }),
    ];

    const result = groupCartBySeller(items);

    expect(result[0].items.map((i) => i.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});
