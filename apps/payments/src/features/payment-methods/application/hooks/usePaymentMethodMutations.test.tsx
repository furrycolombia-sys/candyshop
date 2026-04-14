/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock(
  "@/features/payment-methods/infrastructure/paymentMethodQueries",
  () => ({
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
    deletePaymentMethod: vi.fn(),
  }),
);

import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from "./usePaymentMethodMutations";

import {
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCreatePaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls createPaymentMethod on mutate", async () => {
    vi.mocked(createPaymentMethod).mockResolvedValue({
      id: "m1",
      seller_id: "s1",
      name_en: "Bank Transfer",
      name_es: null,
      display_blocks: [],
      form_fields: [],
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useCreatePaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        sellerId: "s1",
        nameEn: "Bank Transfer",
      }),
    );

    expect(createPaymentMethod).toHaveBeenCalled();
  });
});

describe("useUpdatePaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updatePaymentMethod on mutate", async () => {
    vi.mocked(updatePaymentMethod).mockResolvedValue({
      id: "m1",
      seller_id: "s1",
      name_en: "Updated",
      name_es: null,
      display_blocks: [],
      form_fields: [],
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useUpdatePaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        id: "m1",
        patch: { name_en: "Updated" },
      }),
    );

    expect(updatePaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
      expect.objectContaining({ name_en: "Updated" }),
    );
  });
});

describe("useDeletePaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deletePaymentMethod on mutate", async () => {
    vi.mocked(deletePaymentMethod).mockResolvedValue();

    const { result } = renderHook(() => useDeletePaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("m1"));
    expect(deletePaymentMethod).toHaveBeenCalledWith(expect.anything(), "m1");
  });
});
