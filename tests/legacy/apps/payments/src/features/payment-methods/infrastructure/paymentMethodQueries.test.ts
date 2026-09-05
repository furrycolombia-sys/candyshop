import { describe, it, expect, vi } from "vitest";

import {
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "./paymentMethodQueries";

function createMockSupabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase mock uses dynamic data shapes
  opts: { data?: any; error?: any } = {},
) {
  const { data = [], error = null } = opts;

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  // Make terminal calls resolve to { data, error }
  chain.order.mockReturnValue({ data, error, ...chain });
  chain.eq.mockReturnValue({ data, error, ...chain });

  return {
    from: vi.fn().mockReturnValue(chain),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("fetchPaymentMethods", () => {
  it("returns payment methods for a seller", async () => {
    const mockData = [{ id: "m1", seller_id: "s1" }];
    const supabase = createMockSupabase({ data: mockData });

    const result = await fetchPaymentMethods(supabase, "s1");
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("fail") });
    await expect(fetchPaymentMethods(supabase, "s1")).rejects.toThrow("fail");
  });
});

describe("createPaymentMethod", () => {
  it("inserts a payment method", async () => {
    const mockData = { id: "m2", name_en: "Bank Transfer" };
    const supabase = createMockSupabase({ data: mockData });

    const result = await createPaymentMethod(supabase, "s1", "Bank Transfer");
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("insert fail") });
    await expect(createPaymentMethod(supabase, "s1", "Test")).rejects.toThrow(
      "insert fail",
    );
  });
});

describe("updatePaymentMethod", () => {
  it("updates a payment method", async () => {
    const mockData = { id: "m1", name_en: "Updated" };
    const supabase = createMockSupabase({ data: mockData });

    const result = await updatePaymentMethod(supabase, "m1", {
      name_en: "Updated",
    });
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("update fail") });
    await expect(
      updatePaymentMethod(supabase, "m1", { name_en: "X" }),
    ).rejects.toThrow("update fail");
  });
});

describe("deletePaymentMethod", () => {
  it("deletes a payment method", async () => {
    const supabase = createMockSupabase();
    await deletePaymentMethod(supabase, "m1");
    expect(supabase.from).toHaveBeenCalledWith("seller_payment_methods");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase({ error: new Error("delete fail") });
    await expect(deletePaymentMethod(supabase, "m1")).rejects.toThrow(
      "delete fail",
    );
  });
});
