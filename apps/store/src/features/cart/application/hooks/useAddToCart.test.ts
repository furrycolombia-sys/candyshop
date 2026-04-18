import { renderHook, act } from "@testing-library/react";
import type { Product } from "shared/types";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useAddToCart } from "./useAddToCart";

const mockAddItem = vi.fn();
const mockFire = vi.fn();

vi.mock("@/features/cart/application/CartContext", () => ({
  useCart: () => ({
    addItem: mockAddItem,
    items: [{ id: "p1", quantity: 3 }],
  }),
}));

vi.mock("@/features/cart/application/FlyToCartContext", () => ({
  useFlyToCartContext: () => ({
    fire: mockFire,
    setCartTarget: vi.fn(),
  }),
}));

vi.mock("@/shared/domain/categoryConstants", () => ({
  getCategoryColor: () => "var(--mint)",
}));

const mockProduct: Product = {
  id: "p1",
  slug: "test",
  name_en: "Test",
  name_es: "Test",
  category: "merch",
  type: "merch",
  price_cop: 100_000,
  price_usd: 25,
  max_quantity: null,
  is_active: true,
  created_at: "2024-01-01",
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
  updated_at: "2024-01-01",
  featured: false,
  seller_id: null,
  refundable: null,
  sort_order: 0,
  description_en: "",
  description_es: "",
};

describe("useAddToCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("returns isAdded=false initially", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    expect(result.current.isAdded).toBe(false);
  });

  it("returns quantityInCart from cart items", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    expect(result.current.quantityInCart).toBe(3);
  });

  it("reports when the stock limit is reached", () => {
    const { result } = renderHook(() =>
      useAddToCart({ ...mockProduct, max_quantity: 3 }),
    );
    expect(result.current.hasReachedStockLimit).toBe(true);
  });

  it("calls addItem and fire on handleAddToCart", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: vi
          .fn()
          .mockReturnValue(new DOMRect(0, 0, 100, 40)),
      },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAddToCart(mockEvent);
    });

    expect(mockAddItem).toHaveBeenCalledWith(mockProduct);
    expect(mockFire).toHaveBeenCalled();
    expect(result.current.isAdded).toBe(true);
  });

  it("resets isAdded after timeout", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: vi
          .fn()
          .mockReturnValue(new DOMRect(0, 0, 100, 40)),
      },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAddToCart(mockEvent);
    });
    expect(result.current.isAdded).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isAdded).toBe(false);
  });

  it("does not add or animate when the stock limit is already reached", () => {
    const { result } = renderHook(() =>
      useAddToCart({ ...mockProduct, max_quantity: 3 }),
    );
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: vi
          .fn()
          .mockReturnValue(new DOMRect(0, 0, 100, 40)),
      },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAddToCart(mockEvent);
    });

    expect(mockAddItem).not.toHaveBeenCalled();
    expect(mockFire).not.toHaveBeenCalled();
    expect(result.current.isAdded).toBe(false);
  });
});
