import { describe, it, expect, vi } from "vitest";

import {
  fetchPaymentMethodTypes,
  insertPaymentMethodType,
  updatePaymentMethodType,
  deletePaymentMethodType,
  togglePaymentMethodTypeActive,
} from "./paymentMethodTypeQueries";

import type { PaymentMethodTypeFormValues } from "@/features/payment-method-types/domain/types";

function createChainableMock(
  resolvedData: unknown,
  resolvedError: unknown = null,
) {
  const result = { data: resolvedData, error: resolvedError };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(result),
      single: vi.fn().mockResolvedValue(result),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  >;
}

describe("fetchPaymentMethodTypes", () => {
  it("returns data on success", async () => {
    const mockData = [{ id: "1", name_en: "Bank Transfer" }];
    const supabase = createChainableMock(mockData);

    const result = await fetchPaymentMethodTypes(supabase);
    expect(result).toEqual(mockData);
  });

  it("throws on error", async () => {
    const supabase = createChainableMock(null, { message: "DB error" });
    await expect(fetchPaymentMethodTypes(supabase)).rejects.toEqual({
      message: "DB error",
    });
  });
});

describe("insertPaymentMethodType", () => {
  it("returns created type on success", async () => {
    const created = { id: "new", name_en: "Cash" };
    const supabase = createChainableMock(created);

    const values: PaymentMethodTypeFormValues = {
      name_en: "Cash",
      name_es: "Efectivo",
      description_en: "",
      description_es: "",
      icon: "",
      requires_receipt: false,
      requires_transfer_number: false,
      is_active: true,
    };

    const result = await insertPaymentMethodType(supabase, values);
    expect(result).toEqual(created);
  });
});

describe("updatePaymentMethodType", () => {
  it("returns updated type on success", async () => {
    const updated = { id: "1", name_en: "Updated" };
    const supabase = createChainableMock(updated);

    const result = await updatePaymentMethodType(supabase, "1", {
      name_en: "Updated",
    });
    expect(result).toEqual(updated);
  });
});

describe("deletePaymentMethodType", () => {
  it("resolves on success", async () => {
    const supabase = createChainableMock(null);
    await expect(
      deletePaymentMethodType(supabase, "1"),
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const supabase = createChainableMock(null, { message: "Constraint" });
    await expect(deletePaymentMethodType(supabase, "1")).rejects.toEqual({
      message: "Constraint",
    });
  });
});

describe("togglePaymentMethodTypeActive", () => {
  it("resolves on success", async () => {
    const supabase = createChainableMock(null);
    await expect(
      togglePaymentMethodTypeActive(supabase, "1", false),
    ).resolves.toBeUndefined();
  });
});
