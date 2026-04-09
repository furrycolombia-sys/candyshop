import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CartProvider, useCart } from "@/features/cart/application/CartContext";
import type { CartItem } from "@/features/cart/domain/types";

// ---------------------------------------------------------------------------
// Mock cookies-next — prevent cookie side-effects in tests
// ---------------------------------------------------------------------------

vi.mock("cookies-next", () => ({
  getCookie: vi.fn(() => null),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCartItem(
  overrides: Partial<CartItem> & { id: string; price_usd: number },
): Omit<CartItem, "quantity"> {
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
  } as Omit<CartItem, "quantity">;
}

function renderCartHook() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CartContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCart outside provider", () => {
    it("throws when used outside CartProvider", () => {
      // Suppress console.error for the expected error
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCart());
      }).toThrow("useCart must be used within a CartProvider");

      spy.mockRestore();
    });
  });

  describe("initial state", () => {
    it("starts with an empty cart", () => {
      const { result } = renderCartHook();

      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe("addItem", () => {
    it("adds a new item to the cart", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price_usd: 10 });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("p1");
      expect(result.current.items[0].quantity).toBe(1);
    });

    it("adds item with explicit quantity", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price_usd: 10 });

      act(() => {
        result.current.addItem({ ...product, quantity: 3 });
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    it("increments quantity for existing item", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price_usd: 10 });

      act(() => {
        result.current.addItem(product);
      });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it("increments by explicit quantity for existing item", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price_usd: 10 });

      act(() => {
        result.current.addItem({ ...product, quantity: 2 });
      });

      act(() => {
        result.current.addItem({ ...product, quantity: 3 });
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("keeps different products separate", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
      });

      act(() => {
        result.current.addItem(makeCartItem({ id: "p2", price_usd: 20 }));
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes an item from the cart", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
        result.current.addItem(makeCartItem({ id: "p2", price_usd: 20 }));
      });

      act(() => {
        result.current.removeItem("p1");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("p2");
    });

    it("does nothing when removing non-existent item", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
      });

      act(() => {
        result.current.removeItem("non-existent");
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe("updateQuantity", () => {
    it("changes quantity of an existing item", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
      });

      act(() => {
        result.current.updateQuantity("p1", 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("removes item when quantity set to 0", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
      });

      act(() => {
        result.current.updateQuantity("p1", 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("removes item when quantity set to negative", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
      });

      act(() => {
        result.current.updateQuantity("p1", -1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("clearCart", () => {
    it("empties the cart completely", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price_usd: 10 }));
        result.current.addItem(makeCartItem({ id: "p2", price_usd: 20 }));
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe("derived state", () => {
    it("calculates itemCount as sum of all quantities", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem({
          ...makeCartItem({ id: "p1", price_usd: 10 }),
          quantity: 3,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price_usd: 5 }),
          quantity: 2,
        });
      });

      expect(result.current.itemCount).toBe(5);
    });

    it("calculates total as sum of price * quantity", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem({
          ...makeCartItem({ id: "p1", price_usd: 10 }),
          quantity: 2,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price_usd: 7.5 }),
          quantity: 4,
        });
      });

      expect(result.current.total).toBeCloseTo(10 * 2 + 7.5 * 4, 2);
    });

    it("updates itemCount and total after removal", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem({
          ...makeCartItem({ id: "p1", price_usd: 10 }),
          quantity: 2,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price_usd: 20 }),
          quantity: 1,
        });
      });

      act(() => {
        result.current.removeItem("p1");
      });

      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(20);
    });
  });
});
