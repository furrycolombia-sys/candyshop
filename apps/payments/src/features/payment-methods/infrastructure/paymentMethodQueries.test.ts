import { describe, it, expect, vi } from "vitest";

import {
  fetchPaymentMethodTypes,
  fetchSellerPaymentMethods,
  insertSellerPaymentMethod,
  updateSellerPaymentMethod,
  deleteSellerPaymentMethod,
  toggleSellerPaymentMethodActive,
} from "./paymentMethodQueries";

function createMockSupabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase mock uses dynamic data shapes
  opts: { data?: any; error?: any; userId?: string } = {},
) {
  const { data = [], error = null, userId = "user-1" } = opts;

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  // Make terminal calls resolve to { data, error }
  chain.order.mockReturnValue({ data, error, ...chain });
  chain.eq.mockReturnValue({ data, error, ...chain });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
      }),
    },
    from: vi.fn().mockReturnValue(chain),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("fetchPaymentMethodTypes", () => {
  it("returns payment method types", async () => {
    const mockData = [{ id: "1", name_en: "Cash" }];
    const supabase = createMockSupabase({ data: mockData });

    const result = await fetchPaymentMethodTypes(supabase);
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("payment_method_types");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("fail") });
    await expect(fetchPaymentMethodTypes(supabase)).rejects.toThrow("fail");
  });
});

describe("fetchSellerPaymentMethods", () => {
  it("returns seller payment methods", async () => {
    const mockData = [{ id: "m1" }];
    const supabase = createMockSupabase({ data: mockData });

    const result = await fetchSellerPaymentMethods(supabase);
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("fail") });
    await expect(fetchSellerPaymentMethods(supabase)).rejects.toThrow("fail");
  });
});

describe("insertSellerPaymentMethod", () => {
  it("inserts a payment method", async () => {
    const mockData = { id: "m2" };
    const supabase = createMockSupabase({ data: mockData });

    const result = await insertSellerPaymentMethod(supabase, {
      type_id: "1",
      account_details_en: "Account EN",
      account_details_es: "Account ES",
      seller_note_en: "",
      seller_note_es: "",
      is_active: true,
    });

    expect(result).toEqual(mockData);
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("insert fail") });
    await expect(
      insertSellerPaymentMethod(supabase, {
        type_id: "1",
        account_details_en: "",
        account_details_es: "",
        seller_note_en: "",
        seller_note_es: "",
        is_active: true,
      }),
    ).rejects.toThrow("insert fail");
  });
});

describe("updateSellerPaymentMethod", () => {
  it("updates a payment method", async () => {
    const mockData = { id: "m1" };
    const supabase = createMockSupabase({ data: mockData });

    const result = await updateSellerPaymentMethod(supabase, "m1", {
      type_id: "1",
      account_details_en: "Updated",
      account_details_es: "Actualizado",
      seller_note_en: "",
      seller_note_es: "",
      is_active: true,
    });

    expect(result).toEqual(mockData);
  });
});

describe("deleteSellerPaymentMethod", () => {
  it("deletes a payment method", async () => {
    const supabase = createMockSupabase();
    await deleteSellerPaymentMethod(supabase, "m1");
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("delete fail") });
    await expect(deleteSellerPaymentMethod(supabase, "m1")).rejects.toThrow(
      "delete fail",
    );
  });
});

describe("toggleSellerPaymentMethodActive", () => {
  it("toggles active state", async () => {
    const supabase = createMockSupabase();
    await toggleSellerPaymentMethodActive(supabase, "m1", false);
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("toggle fail") });
    await expect(
      toggleSellerPaymentMethodActive(supabase, "m1", true),
    ).rejects.toThrow("toggle fail");
  });
});
