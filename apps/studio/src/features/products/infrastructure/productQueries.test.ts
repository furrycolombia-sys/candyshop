import { describe, it, expect, vi } from "vitest";

import {
  fetchProducts,
  toggleProductField,
  deleteProduct,
  reorderProducts,
} from "./productQueries";

describe("fetchProducts", () => {
  it("fetches products for the current user", async () => {
    const mockData = [{ id: "1", name_en: "Product" }];

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchProducts(supabase as any);
    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(result).toEqual(mockData);
  });

  it("throws on supabase error", async () => {
    const mockError = new Error("DB error");
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(fetchProducts(supabase as any)).rejects.toThrow("DB error");
  });
});

describe("toggleProductField", () => {
  it("updates the specified field", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await toggleProductField(supabase as any, "prod-1", "is_active", true);
    expect(supabase.from).toHaveBeenCalledWith("products");
  });

  it("throws on error", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: new Error("fail") }),
        }),
      }),
    };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toggleProductField(supabase as any, "prod-1", "featured", false),
    ).rejects.toThrow("fail");
  });
});

describe("deleteProduct", () => {
  it("deletes a product by ID", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteProduct(supabase as any, "prod-1");
    expect(supabase.from).toHaveBeenCalledWith("products");
  });

  it("throws on error", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: new Error("delete failed") }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deleteProduct(supabase as any, "prod-1")).rejects.toThrow(
      "delete failed",
    );
  });
});

describe("reorderProducts", () => {
  it("calls update for each product", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const supabase = { from: mockFrom };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await reorderProducts(supabase as any, [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("throws on error in any update", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("reorder fail") }),
        }),
      }),
    };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reorderProducts(supabase as any, [{ id: "a", sortOrder: 1 }]),
    ).rejects.toThrow("reorder fail");
  });
});
