/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock(
  "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries",
  () => ({
    fetchPaymentMethodTypes: vi.fn(),
  }),
);

import { usePaymentMethodTypes } from "./usePaymentMethodTypes";

import { fetchPaymentMethodTypes } from "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePaymentMethodTypes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns data on success", async () => {
    const mock: import("@/features/payment-method-types/domain/types").PaymentMethodType[] =
      [
        {
          id: "1",
          name_en: "Credit Card",
          name_es: "Tarjeta de Crédito",
          description_en: null,
          description_es: null,
          icon: null,
          requires_receipt: false,
          requires_transfer_number: false,
          is_active: true,
          sort_order: 0,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
    vi.mocked(fetchPaymentMethodTypes).mockResolvedValue(mock);

    const { result } = renderHook(() => usePaymentMethodTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("handles error", async () => {
    vi.mocked(fetchPaymentMethodTypes).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => usePaymentMethodTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
