import { describe, it, expect, vi } from "vitest";

import {
  fetchProductById,
  insertProduct,
  updateProduct,
} from "./productMutations";

function createMockSupabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase mock uses dynamic data shapes
  data: any = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase mock uses dynamic error shapes
  error: any = null,
  userId = "user-1",
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("fetchProductById", () => {
  it("returns product data", async () => {
    const mock = { id: "p1", name_en: "Product" };
    const supabase = createMockSupabase(mock);

    const result = await fetchProductById(supabase, "p1");
    expect(result).toEqual(mock);
    expect(supabase.from).toHaveBeenCalledWith("products");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, new Error("not found"));
    await expect(fetchProductById(supabase, "p1")).rejects.toThrow("not found");
  });
});

describe("insertProduct", () => {
  it("inserts a product with sort_order and seller_id", async () => {
    const mockProduct = { id: "new-1", name_en: "New" };
    const supabase = createMockSupabase(mockProduct);

    const result = await insertProduct(supabase, {
      name_en: "New",
      name_es: "Nuevo",
      type: "merch",
      category: "merch",
      price: 10_000,
      currency: "COP",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(result).toEqual(mockProduct);
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, new Error("insert fail"));
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insertProduct(supabase, { name_en: "X" } as any),
    ).rejects.toThrow("insert fail");
  });
});

describe("updateProduct", () => {
  it("updates a product", async () => {
    const mockProduct = { id: "p1", name_en: "Updated" };
    const supabase = createMockSupabase(mockProduct);

    const result = await updateProduct(supabase, "p1", { name_en: "Updated" });
    expect(result).toEqual(mockProduct);
    expect(supabase.from).toHaveBeenCalledWith("products");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, new Error("update fail"));
    await expect(
      updateProduct(supabase, "p1", { name_en: "X" }),
    ).rejects.toThrow("update fail");
  });
});
