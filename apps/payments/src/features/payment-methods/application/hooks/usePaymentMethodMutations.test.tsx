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
    insertSellerPaymentMethod: vi.fn(),
    updateSellerPaymentMethod: vi.fn(),
    deleteSellerPaymentMethod: vi.fn(),
    toggleSellerPaymentMethodActive: vi.fn(),
  }),
);

import {
  useInsertSellerPaymentMethod,
  useUpdateSellerPaymentMethod,
  useDeleteSellerPaymentMethod,
  useToggleSellerPaymentMethodActive,
} from "./usePaymentMethodMutations";

import {
  insertSellerPaymentMethod,
  updateSellerPaymentMethod,
  deleteSellerPaymentMethod,
  toggleSellerPaymentMethodActive,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useInsertSellerPaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls insertSellerPaymentMethod on mutate", async () => {
    vi.mocked(insertSellerPaymentMethod).mockResolvedValue({
      id: "m1",
      seller_id: "s1",
      type_id: "1",
      account_details_en: null,
      account_details_es: null,
      seller_note_en: null,
      seller_note_es: null,
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useInsertSellerPaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        type_id: "1",
        account_details_en: "John",
        account_details_es: "John",
        seller_note_en: "",
        seller_note_es: "",
        is_active: true,
      }),
    );

    expect(insertSellerPaymentMethod).toHaveBeenCalled();
  });
});

describe("useUpdateSellerPaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateSellerPaymentMethod on mutate", async () => {
    vi.mocked(updateSellerPaymentMethod).mockResolvedValue({
      id: "m1",
      seller_id: "s1",
      type_id: "1",
      account_details_en: "Jane",
      account_details_es: "Jane",
      seller_note_en: null,
      seller_note_es: null,
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useUpdateSellerPaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        id: "m1",
        values: {
          type_id: "1",
          account_details_en: "Jane",
          account_details_es: "Jane",
          seller_note_en: "",
          seller_note_es: "",
          is_active: true,
        },
      }),
    );

    expect(updateSellerPaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
      expect.objectContaining({ account_details_en: "Jane" }),
    );
  });
});

describe("useDeleteSellerPaymentMethod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deleteSellerPaymentMethod on mutate", async () => {
    vi.mocked(deleteSellerPaymentMethod).mockResolvedValue();

    const { result } = renderHook(() => useDeleteSellerPaymentMethod(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("m1"));
    expect(deleteSellerPaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
    );
  });
});

describe("useToggleSellerPaymentMethodActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls toggleSellerPaymentMethodActive on mutate", async () => {
    vi.mocked(toggleSellerPaymentMethodActive).mockResolvedValue();

    const { result } = renderHook(() => useToggleSellerPaymentMethodActive(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync({ id: "m1", isActive: false }));

    expect(toggleSellerPaymentMethodActive).toHaveBeenCalledWith(
      expect.anything(),
      "m1",
      false,
    );
  });
});
