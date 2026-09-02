/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock(
  "@/features/payment-methods/infrastructure/paymentMethodQueries",
  () => ({
    fetchPaymentMethods: vi.fn(),
  }),
);

import { usePaymentMethods } from "./usePaymentMethods";

import { fetchPaymentMethods } from "@/features/payment-methods/infrastructure/paymentMethodQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePaymentMethods", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns payment methods for a seller", async () => {
    const mock: import("@/features/payment-methods/domain/types").SellerPaymentMethod[] =
      [
        {
          id: "m1",
          seller_id: "s1",
          name_en: "Bank Transfer",
          name_es: "Transferencia",
          display_blocks: [],
          form_fields: [],
          is_active: true,
          requires_receipt: false,
          requires_transfer_number: false,
          sort_order: 0,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
    vi.mocked(fetchPaymentMethods).mockResolvedValue(mock);

    const { result } = renderHook(() => usePaymentMethods("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("does not fetch when sellerId is empty", () => {
    const { result } = renderHook(() => usePaymentMethods(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(fetchPaymentMethods).not.toHaveBeenCalled();
  });
});
