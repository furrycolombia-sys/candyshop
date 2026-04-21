/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: vi.fn(() => "es"),
}));

vi.mock("@/features/checkout/infrastructure/cartCookie", () => ({
  readCartFromCookie: vi.fn(() => []),
  subscribeToCartCookie: vi.fn(() => () => {}),
}));

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({})),
}));

vi.mock("@/features/checkout/infrastructure/checkoutQueries", () => ({
  fetchCheckoutProductsByIds: vi.fn(async () => []),
}));

vi.mock("./useSellerProfiles", () => ({
  useSellerProfiles: vi.fn(() => ({ data: {}, isLoading: false })),
}));

import { useCartFromCookie } from "./useCartFromCookie";
import { useSellerProfiles } from "./useSellerProfiles";

import {
  readCartFromCookie,
  subscribeToCartCookie,
} from "@/features/checkout/infrastructure/cartCookie";
import { fetchCheckoutProductsByIds } from "@/features/checkout/infrastructure/checkoutQueries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCartFromCookie", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns isEmpty=true when cart is empty after hydration", async () => {
    vi.mocked(readCartFromCookie).mockReturnValue([]);

    const { result } = renderHook(() => useCartFromCookie(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.groups).toEqual([]);
  });

  it("groups items by seller_id", async () => {
    const cookieItems = [
      { id: "p1", quantity: 2 },
      { id: "p2", quantity: 1 },
    ];
    const products = [
      {
        id: "p1",
        seller_id: "s1",
        price: 10_000,
        currency: "COP",
        name_en: "Hat",
        name_es: "Sombrero",
        images: [],
        max_quantity: null,
      },
      {
        id: "p2",
        seller_id: "s1",
        price: 5000,
        currency: "COP",
        name_en: "Pin",
        name_es: "Pin",
        images: [],
        max_quantity: null,
      },
    ];
    vi.mocked(readCartFromCookie).mockReturnValue(cookieItems);
    vi.mocked(fetchCheckoutProductsByIds).mockResolvedValue(products);
    vi.mocked(useSellerProfiles).mockReturnValue({
      data: { s1: "Seller One" },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerProfiles>);

    const { result } = renderHook(() => useCartFromCookie(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].sellerId).toBe("s1");
    expect(result.current.groups[0].sellerName).toBe("Seller One");
    expect(result.current.groups[0].items).toHaveLength(2);
    expect(result.current.groups[0].items[0].quantity).toBe(2);
    expect(result.current.groups[0].items[1].quantity).toBe(1);
    expect(result.current.groups[0].subtotal).toBe(25_000);
    expect(result.current.groups[0].currency).toBe("COP");
  });

  it("subscribes to cart cookie changes", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeToCartCookie).mockReturnValue(unsubscribe);

    renderHook(() => useCartFromCookie(), { wrapper: createWrapper() });

    expect(subscribeToCartCookie).toHaveBeenCalled();
  });
});
