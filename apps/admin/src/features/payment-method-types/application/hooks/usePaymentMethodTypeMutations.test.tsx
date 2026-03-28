/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock(
  "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries",
  () => ({
    insertPaymentMethodType: vi.fn(),
    updatePaymentMethodType: vi.fn(),
    deletePaymentMethodType: vi.fn(),
    togglePaymentMethodTypeActive: vi.fn(),
  }),
);

import {
  useInsertPaymentMethodType,
  useUpdatePaymentMethodType,
  useDeletePaymentMethodType,
  useTogglePaymentMethodTypeActive,
} from "./usePaymentMethodTypeMutations";

import {
  insertPaymentMethodType,
  updatePaymentMethodType,
  deletePaymentMethodType,
  togglePaymentMethodTypeActive,
} from "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useInsertPaymentMethodType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls insertPaymentMethodType on mutate", async () => {
    vi.mocked(insertPaymentMethodType).mockResolvedValue({
      id: "1",
      name_en: "Card",
      name_es: "Tarjeta",
      description_en: null,
      description_es: null,
      icon: "credit-card",
      requires_receipt: false,
      requires_transfer_number: false,
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useInsertPaymentMethodType(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        name_en: "Card",
        name_es: "Tarjeta",
        description_en: "",
        description_es: "",
        icon: "credit-card",
        requires_receipt: false,
        requires_transfer_number: false,
        is_active: true,
      }),
    );

    expect(insertPaymentMethodType).toHaveBeenCalledWith(expect.anything(), {
      name_en: "Card",
      name_es: "Tarjeta",
      description_en: "",
      description_es: "",
      icon: "credit-card",
      requires_receipt: false,
      requires_transfer_number: false,
      is_active: true,
    });
  });
});

describe("useUpdatePaymentMethodType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updatePaymentMethodType on mutate", async () => {
    vi.mocked(updatePaymentMethodType).mockResolvedValue({
      id: "1",
      name_en: "Debit",
      name_es: "Débito",
      description_en: null,
      description_es: null,
      icon: null,
      requires_receipt: false,
      requires_transfer_number: false,
      is_active: true,
      sort_order: 0,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });

    const { result } = renderHook(() => useUpdatePaymentMethodType(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({ id: "1", values: { name_en: "Debit" } }),
    );

    expect(updatePaymentMethodType).toHaveBeenCalledWith(
      expect.anything(),
      "1",
      { name_en: "Debit" },
    );
  });
});

describe("useDeletePaymentMethodType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deletePaymentMethodType on mutate", async () => {
    vi.mocked(deletePaymentMethodType).mockResolvedValue();

    const { result } = renderHook(() => useDeletePaymentMethodType(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("1"));

    expect(deletePaymentMethodType).toHaveBeenCalledWith(
      expect.anything(),
      "1",
    );
  });
});

describe("useTogglePaymentMethodTypeActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls togglePaymentMethodTypeActive on mutate", async () => {
    vi.mocked(togglePaymentMethodTypeActive).mockResolvedValue();

    const { result } = renderHook(() => useTogglePaymentMethodTypeActive(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync({ id: "1", isActive: false }));

    expect(togglePaymentMethodTypeActive).toHaveBeenCalledWith(
      expect.anything(),
      "1",
      false,
    );
  });
});
