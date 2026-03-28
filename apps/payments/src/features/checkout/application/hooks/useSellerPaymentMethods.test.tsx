/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/checkout/infrastructure/checkoutQueries", () => ({
  fetchSellerPaymentMethods: vi.fn(),
}));

import { useSellerPaymentMethods } from "./useSellerPaymentMethods";

import { fetchSellerPaymentMethods } from "@/features/checkout/infrastructure/checkoutQueries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSellerPaymentMethods", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns payment methods on success", async () => {
    const mock: import("@/features/checkout/domain/types").SellerPaymentMethodWithType[] =
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
    vi.mocked(fetchSellerPaymentMethods).mockResolvedValue(mock);
    const { result } = renderHook(() => useSellerPaymentMethods("seller-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("does not fetch when sellerId is empty", () => {
    renderHook(() => useSellerPaymentMethods(""), { wrapper: createWrapper() });
    expect(fetchSellerPaymentMethods).not.toHaveBeenCalled();
  });
});
