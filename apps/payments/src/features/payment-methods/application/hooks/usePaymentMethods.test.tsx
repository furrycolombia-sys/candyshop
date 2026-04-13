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
    fetchSellerPaymentMethods: vi.fn(),
    fetchPaymentMethods: vi.fn(),
  }),
);

import { useSellerPaymentMethods } from "./usePaymentMethods";

import { fetchSellerPaymentMethods } from "@/features/payment-methods/infrastructure/paymentMethodQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSellerPaymentMethods", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns seller methods on success", async () => {
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
          sort_order: 0,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
    vi.mocked(fetchSellerPaymentMethods).mockResolvedValue(mock);

    const { result } = renderHook(() => useSellerPaymentMethods(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });
});
