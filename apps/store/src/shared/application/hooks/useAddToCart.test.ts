import { renderHook, act } from "@testing-library/react";
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
  getCategoryColor: () => "bg-mint",
}));

const mockProduct = {
  id: "p1",
  slug: "test",
  name_en: "Test",
  name_es: "Test",
  category: "merch",
  type: "merch",
  price_cop: 100_000,
  price_usd: 25,
} as never;

describe("useAddToCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("returns added=false initially", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    expect(result.current.added).toBe(false);
  });

  it("returns quantityInCart from cart items", () => {
    const { result } = renderHook(() => useAddToCart(mockProduct));
    expect(result.current.quantityInCart).toBe(3);
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
    expect(result.current.added).toBe(true);
  });

  it("resets added after timeout", () => {
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
    expect(result.current.added).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.added).toBe(false);
  });
});
