import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CartProvider, useCart } from "@/features/cart/application/CartContext";
import type { CartItem } from "@/features/cart/domain/types";

// ---------------------------------------------------------------------------
// Mock next-intl — pulled in transitively via @/features/products barrel
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

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
  overrides: Partial<CartItem> & { id: string; price: number },
): Omit<CartItem, "quantity"> {
  return {
    slug: "test-slug",
    name_en: "Test Product",
    name_es: "Producto de Prueba",
    type: "merch",
    category: "merch",
    currency: "USD",
    max_quantity: null,
    is_active: true,
    images: [],
    seller_id: null,
    refundable: null,
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
      const product = makeCartItem({ id: "p1", price: 10 });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("p1");
      expect(result.current.items[0].quantity).toBe(1);
    });

    it("adds item with explicit quantity", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price: 10 });

      act(() => {
        result.current.addItem({ ...product, quantity: 3 });
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    it("increments quantity for existing item", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({ id: "p1", price: 10 });

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
      const product = makeCartItem({ id: "p1", price: 10 });

      act(() => {
        result.current.addItem({ ...product, quantity: 2 });
      });

      act(() => {
        result.current.addItem({ ...product, quantity: 3 });
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("caps added quantity at max_quantity", () => {
      const { result } = renderCartHook();
      const product = makeCartItem({
        id: "p1",
        price: 10,
        max_quantity: 2,
      });

      act(() => {
        result.current.addItem({ ...product, quantity: 2 });
      });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items[0].quantity).toBe(2);
    });

    it("keeps different products separate", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
      });

      act(() => {
        result.current.addItem(makeCartItem({ id: "p2", price: 20 }));
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes an item from the cart", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
        result.current.addItem(makeCartItem({ id: "p2", price: 20 }));
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
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
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
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
      });

      act(() => {
        result.current.updateQuantity("p1", 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("caps updated quantity at max_quantity", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(
          makeCartItem({ id: "p1", price: 10, max_quantity: 3 }),
        );
      });

      act(() => {
        result.current.updateQuantity("p1", 5);
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    it("removes item when quantity set to 0", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
      });

      act(() => {
        result.current.updateQuantity("p1", 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("removes item when quantity set to negative", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
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
        result.current.addItem(makeCartItem({ id: "p1", price: 10 }));
        result.current.addItem(makeCartItem({ id: "p2", price: 20 }));
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
          ...makeCartItem({ id: "p1", price: 10 }),
          quantity: 3,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price: 5 }),
          quantity: 2,
        });
      });

      expect(result.current.itemCount).toBe(5);
    });

    it("calculates total as sum of price * quantity", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem({
          ...makeCartItem({ id: "p1", price: 10 }),
          quantity: 2,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price: 7.5 }),
          quantity: 4,
        });
      });

      expect(result.current.total).toBeCloseTo(10 * 2 + 7.5 * 4, 2);
    });

    it("updates itemCount and total after removal", () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addItem({
          ...makeCartItem({ id: "p1", price: 10 }),
          quantity: 2,
        });
        result.current.addItem({
          ...makeCartItem({ id: "p2", price: 20 }),
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
