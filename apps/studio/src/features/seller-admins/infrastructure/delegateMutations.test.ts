import { describe, it, expect, vi } from "vitest";

import {
  addDelegate,
  updateDelegatePermissions,
  removeDelegate,
} from "./delegateMutations";

/* ------------------------------------------------------------------ */
/*  Supabase mock helpers                                              */
/* ------------------------------------------------------------------ */

function createMockSupabase(overrides: {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}) {
  const { data = null, error = null } = overrides;

  const resolved = Promise.resolve({ data, error });

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  // Every chain method returns the resolved promise decorated with chain methods
  const chainable = Object.assign(resolved, chain);
  for (const key of Object.keys(chain)) {
    chain[key].mockReturnValue(chainable);
  }

  const from = vi.fn().mockReturnValue(chainable);

  return { from, _chain: chain } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  > & { _chain: typeof chain };
}

/* ------------------------------------------------------------------ */
/*  addDelegate                                                        */
/* ------------------------------------------------------------------ */

describe("addDelegate", () => {
  it("inserts a delegation row with product_id and returns it", async () => {
    const mockRow = {
      id: "d1",
      seller_id: "seller-1",
      admin_user_id: "admin-1",
      product_id: "product-1",
      permissions: ["orders.approve"],
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    const supabase = createMockSupabase({ data: mockRow });
    const result = await addDelegate(
      supabase,
      "seller-1",
      "admin-1",
      ["orders.approve"],
      "product-1",
    );

    expect(result).toEqual(mockRow);
    expect(supabase.from).toHaveBeenCalledWith("seller_admins");
    expect(supabase._chain.insert).toHaveBeenCalledWith({
      seller_id: "seller-1",
      admin_user_id: "admin-1",
      permissions: ["orders.approve"],
      product_id: "product-1",
    });
  });

  it("throws validation error for self-delegation before DB call", async () => {
    const supabase = createMockSupabase({ data: null });

    await expect(
      addDelegate(supabase, "user-1", "user-1", ["orders.approve"], "prod-1"),
    ).rejects.toThrow("Cannot delegate to yourself");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws validation error for empty permissions", async () => {
    const supabase = createMockSupabase({ data: null });

    await expect(
      addDelegate(supabase, "seller-1", "admin-1", [], "product-1"),
    ).rejects.toThrow("At least one permission is required");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws validation error for invalid permission", async () => {
    const supabase = createMockSupabase({ data: null });

    await expect(
      addDelegate(
        supabase,
        "seller-1",
        "admin-1",
        ["invalid.perm" as never],
        "product-1",
      ),
    ).rejects.toThrow("Invalid permission: invalid.perm");
  });

  it("throws on supabase error", async () => {
    const supabase = createMockSupabase({
      error: { message: "unique constraint violation", code: "23505" },
    });

    await expect(
      addDelegate(
        supabase,
        "seller-1",
        "admin-1",
        ["orders.approve"],
        "product-1",
      ),
    ).rejects.toEqual({
      message: "unique constraint violation",
      code: "23505",
    });
  });
});

/* ------------------------------------------------------------------ */
/*  updateDelegatePermissions                                          */
/* ------------------------------------------------------------------ */

describe("updateDelegatePermissions", () => {
  it("updates permissions for the correct seller-admin pair", async () => {
    const supabase = createMockSupabase({ data: null });
    await updateDelegatePermissions(supabase, "seller-1", "admin-1", [
      "orders.approve",
      "orders.request_proof",
    ]);

    expect(supabase.from).toHaveBeenCalledWith("seller_admins");
    expect(supabase._chain.update).toHaveBeenCalledWith({
      permissions: ["orders.approve", "orders.request_proof"],
    });
    expect(supabase._chain.eq).toHaveBeenCalledWith("seller_id", "seller-1");
    expect(supabase._chain.eq).toHaveBeenCalledWith("admin_user_id", "admin-1");
  });

  it("validates input before updating", async () => {
    const supabase = createMockSupabase({ data: null });

    await expect(
      updateDelegatePermissions(supabase, "user-1", "user-1", [
        "orders.approve",
      ]),
    ).rejects.toThrow("Cannot delegate to yourself");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws on supabase error", async () => {
    const supabase = createMockSupabase({
      error: { message: "update failed" },
    });

    await expect(
      updateDelegatePermissions(supabase, "seller-1", "admin-1", [
        "orders.approve",
      ]),
    ).rejects.toEqual({ message: "update failed" });
  });
});

/* ------------------------------------------------------------------ */
/*  removeDelegate                                                     */
/* ------------------------------------------------------------------ */

describe("removeDelegate", () => {
  it("deletes the correct seller-admin-product row", async () => {
    const supabase = createMockSupabase({ data: null });
    await removeDelegate(supabase, "seller-1", "admin-1", "product-1");

    expect(supabase.from).toHaveBeenCalledWith("seller_admins");
    expect(supabase._chain.delete).toHaveBeenCalled();
    expect(supabase._chain.eq).toHaveBeenCalledWith("seller_id", "seller-1");
    expect(supabase._chain.eq).toHaveBeenCalledWith("admin_user_id", "admin-1");
    expect(supabase._chain.eq).toHaveBeenCalledWith("product_id", "product-1");
  });

  it("throws on supabase error", async () => {
    const supabase = createMockSupabase({
      error: { message: "delete failed" },
    });

    await expect(
      removeDelegate(supabase, "seller-1", "admin-1", "product-1"),
    ).rejects.toEqual({ message: "delete failed" });
  });
});
