/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSellerPaymentMethods } from "./useSellerPaymentMethods";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSellerPaymentMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns payment methods on success", async () => {
    const mockMethods: import("@/features/checkout/domain/types").SellerPaymentMethodWithType[] =
      [
        {
          id: "pm1",
          type_name_en: "Cash",
          type_name_es: "Efectivo",
          type_icon: null,
          requires_receipt: false,
          requires_transfer_number: false,
          account_details_en: null,
          account_details_es: null,
          seller_note_en: null,
          seller_note_es: null,
        },
      ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ methods: mockMethods, hasStockIssues: false }),
    } as Response);
    const { result } = renderHook(
      () =>
        useSellerPaymentMethods("seller-1", [
          {
            id: "product-1",
            name_en: "Widget",
            name_es: "Widget",
            price_cop: 5000,
            price_usd: 1,
            seller_id: "seller-1",
            quantity: 2,
            images: [],
            max_quantity: 5,
          },
        ]),
      {
        wrapper: createWrapper(),
      },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({
      methods: mockMethods,
      hasStockIssues: false,
    });
  });

  it("does not fetch when sellerId is empty", () => {
    renderHook(() => useSellerPaymentMethods("", []), {
      wrapper: createWrapper(),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a stock-issue response without payment methods", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ methods: [], hasStockIssues: true }),
    } as Response);

    const { result } = renderHook(
      () =>
        useSellerPaymentMethods("seller-1", [
          {
            id: "product-1",
            name_en: "Widget",
            name_es: "Widget",
            price_cop: 5000,
            price_usd: 1,
            seller_id: "seller-1",
            quantity: 99,
            images: [],
            max_quantity: 1,
          },
        ]),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({
      methods: [],
      hasStockIssues: true,
    });
  });
});
