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
    fetchPaymentMethodTypes: vi.fn(),
    fetchSellerPaymentMethods: vi.fn(),
    fetchPaymentMethods: vi.fn(),
  }),
);

import {
  usePaymentMethodTypes,
  useSellerPaymentMethods,
} from "./usePaymentMethods";

import {
  fetchPaymentMethodTypes,
  fetchSellerPaymentMethods,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

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

  it("returns types on success", async () => {
    const mock: import("@/features/payment-methods/domain/types").PaymentMethodType[] =
      [
        {
          id: "1",
          name_en: "Cash",
          name_es: "Efectivo",
          description_en: null,
          description_es: null,
          icon: null,
          requires_receipt: false,
          requires_transfer_number: false,
          is_active: true,
        },
      ];
    vi.mocked(fetchPaymentMethodTypes).mockResolvedValue(mock);

    const { result } = renderHook(() => usePaymentMethodTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });
});

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
