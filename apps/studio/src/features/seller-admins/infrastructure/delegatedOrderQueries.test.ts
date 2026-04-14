import { describe, it, expect, vi } from "vitest";

import { fetchDelegatedOrders } from "./delegatedOrderQueries";

/* ------------------------------------------------------------------ */
/*  Supabase mock helpers                                              */
/* ------------------------------------------------------------------ */

interface MockChainResult {
  data?: unknown;
  error?: { message: string } | null;
}

/**
 * Creates a mock Supabase client that returns different results
 * for sequential `.from()` calls.
 */
function createSequentialMockSupabase(results: MockChainResult[]) {
  let callIndex = 0;

  const from = vi.fn().mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;

    const resolved = Promise.resolve({
      data: result.data,
      error: result.error ?? null,
    });

    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      single: vi.fn(),
    };

    const chainable = Object.assign(resolved, chain);
    for (const key of Object.keys(chain)) {
      chain[key].mockReturnValue(chainable);
    }

    return chainable;
  });

  return { from } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  >;
}

/* ------------------------------------------------------------------ */
/*  fetchDelegatedOrders                                               */
/* ------------------------------------------------------------------ */

describe("fetchDelegatedOrders", () => {
  it("returns orders grouped by seller", async () => {
    const delegations = [
      {
        seller_id: "seller-1",
        permissions: ["orders.approve"],
        seller_profile: { id: "seller-1", display_name: "Seller One" },
      },
    ];

    const orders = [
      {
        id: "order-1",
        seller_id: "seller-1",
        payment_status: "pending_verification",
      },
    ];

    const supabase = createSequentialMockSupabase([
      { data: delegations },
      { data: orders },
    ]);

    const result = await fetchDelegatedOrders(supabase, "delegate-1");

    expect(result).toHaveLength(1);
    expect(result[0].seller).toEqual({
      seller_id: "seller-1",
      seller_display_name: "Seller One",
      permissions: ["orders.approve"],
    });
    expect(result[0].orders).toEqual(orders);
  });

  it("returns empty array when user has no delegations", async () => {
    const supabase = createSequentialMockSupabase([{ data: [] }]);

    const result = await fetchDelegatedOrders(supabase, "delegate-1");

    expect(result).toEqual([]);
  });

  it("filters out sellers with no actionable orders", async () => {
    const delegations = [
      {
        seller_id: "seller-1",
        permissions: ["orders.approve"],
        seller_profile: { id: "seller-1", display_name: "Seller One" },
      },
    ];

    const supabase = createSequentialMockSupabase([
      { data: delegations },
      { data: [] }, // no orders for seller-1
    ]);

    const result = await fetchDelegatedOrders(supabase, "delegate-1");

    expect(result).toEqual([]);
  });

  it("handles multiple delegations", async () => {
    const delegations = [
      {
        seller_id: "seller-1",
        permissions: ["orders.approve"],
        seller_profile: { id: "seller-1", display_name: "Seller One" },
      },
      {
        seller_id: "seller-2",
        permissions: ["orders.request_proof"],
        seller_profile: { id: "seller-2", display_name: "Seller Two" },
      },
    ];

    const orders1 = [{ id: "o1", seller_id: "seller-1" }];
    const orders2 = [{ id: "o2", seller_id: "seller-2" }];

    const supabase = createSequentialMockSupabase([
      { data: delegations },
      { data: orders1 },
      { data: orders2 },
    ]);

    const result = await fetchDelegatedOrders(supabase, "delegate-1");

    expect(result).toHaveLength(2);
    expect(result[0].seller.seller_id).toBe("seller-1");
    expect(result[1].seller.seller_id).toBe("seller-2");
  });

  it("throws on delegation query error", async () => {
    const supabase = createSequentialMockSupabase([
      { error: { message: "RLS error" } },
    ]);

    await expect(fetchDelegatedOrders(supabase, "delegate-1")).rejects.toEqual({
      message: "RLS error",
    });
  });

  it("throws on orders query error", async () => {
    const delegations = [
      {
        seller_id: "seller-1",
        permissions: ["orders.approve"],
        seller_profile: { id: "seller-1", display_name: "Seller One" },
      },
    ];

    const supabase = createSequentialMockSupabase([
      { data: delegations },
      { error: { message: "orders error" } },
    ]);

    await expect(fetchDelegatedOrders(supabase, "delegate-1")).rejects.toEqual({
      message: "orders error",
    });
  });

  it("handles null display_name gracefully", async () => {
    const delegations = [
      {
        seller_id: "seller-1",
        permissions: ["orders.approve"],
        seller_profile: { id: "seller-1", display_name: null },
      },
    ];

    const orders = [{ id: "o1", seller_id: "seller-1" }];

    const supabase = createSequentialMockSupabase([
      { data: delegations },
      { data: orders },
    ]);

    const result = await fetchDelegatedOrders(supabase, "delegate-1");

    expect(result[0].seller.seller_display_name).toBeNull();
  });
});
