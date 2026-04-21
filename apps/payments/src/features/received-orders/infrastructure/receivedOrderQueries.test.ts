import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  getReceiptUrl: vi.fn(
    async (_supabase: unknown, storagePath: string | null) =>
      storagePath ? `https://example.com/${storagePath}` : null,
  ),
}));

import {
  fetchPendingOrderCount,
  fetchReceivedOrders,
  updateOrderStatus,
} from "./receivedOrderQueries";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn(() => chain),
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    _chain: chain,
  };
}

// ---------------------------------------------------------------------------
// fetchReceivedOrders
// ---------------------------------------------------------------------------

describe("fetchReceivedOrders", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("returns empty array when no user is authenticated", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await fetchReceivedOrders(
      supabase as unknown as Parameters<typeof fetchReceivedOrders>[0],
    );

    expect(result).toEqual([]);
  });

  it("returns orders with buyer names", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "seller-1" } },
    });

    // Orders query (no filter so it goes through order())
    supabase._chain.order.mockResolvedValueOnce({
      data: [
        {
          id: "o1",
          user_id: "buyer-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
          total_cop: 10_000,
          transfer_number: "TX-1",
          receipt_url: "order-1/receipt.png",
          seller_note: null,
          expires_at: null,
          checkout_session_id: "sess-1",
          created_at: "2026-01-01T00:00:00Z",
          order_items: [
            {
              id: "oi1",
              product_id: "p1",
              quantity: 1,
              unit_price_cop: 10_000,
              metadata: {},
            },
          ],
        },
      ],
      error: null,
    });

    // Buyer names query
    supabase._chain.in.mockResolvedValueOnce({
      data: [
        { id: "buyer-1", display_name: "Buyer Bob", email: "bob@example.com" },
      ],
      error: null,
    });

    const result = await fetchReceivedOrders(
      supabase as unknown as Parameters<typeof fetchReceivedOrders>[0],
    );

    expect(result).toHaveLength(1);
    expect(result[0].buyer_name).toBe("Buyer Bob");
    expect(result[0].payment_status).toBe("pending_verification");
    expect(result[0].receipt_url).toBe(
      "https://example.com/order-1/receipt.png",
    );
  });

  it("applies filter when provided and not 'all'", async () => {
    // Use a fresh supabase mock with custom chaining for the filter path.
    // Flow: from().select().eq("seller_id").order() returns query object,
    // then query.eq("payment_status", "approved") is called on it,
    // then `await query` resolves { data, error }.
    //
    // We make .order() return a new chainable whose .eq resolves.
    const filterChain = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(filterChain),
    };
    const sb = {
      from: vi.fn(() => queryChain),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "seller-1" } },
        }),
      },
    };

    await fetchReceivedOrders(
      sb as unknown as Parameters<typeof fetchReceivedOrders>[0],
      "approved",
    );

    expect(filterChain.eq).toHaveBeenCalledWith("payment_status", "approved");
  });

  it("throws on query error", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "seller-1" } },
    });

    supabase._chain.order.mockResolvedValue({
      data: null,
      error: new Error("Query failed"),
    });

    await expect(
      fetchReceivedOrders(
        supabase as unknown as Parameters<typeof fetchReceivedOrders>[0],
      ),
    ).rejects.toThrow("Query failed");
  });
});

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------

describe("updateOrderStatus", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("calls rpc with correct arguments", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await updateOrderStatus(
      supabase as unknown as Parameters<typeof updateOrderStatus>[0],
      "order-1",
      "approved",
      "Looks good",
    );

    expect(supabase.rpc).toHaveBeenCalledWith("update_order_status", {
      p_order_id: "order-1",
      p_new_status: "approved",
      p_seller_note: "Looks good",
    });
  });

  it("passes undefined for seller_note when not provided", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await updateOrderStatus(
      supabase as unknown as Parameters<typeof updateOrderStatus>[0],
      "order-1",
      "approved",
    );

    expect(supabase.rpc).toHaveBeenCalledWith("update_order_status", {
      p_order_id: "order-1",
      p_new_status: "approved",
      p_seller_note: undefined,
    });
  });

  it("throws on error", async () => {
    supabase.rpc.mockResolvedValue({ error: new Error("RPC failed") });

    await expect(
      updateOrderStatus(
        supabase as unknown as Parameters<typeof updateOrderStatus>[0],
        "order-1",
        "rejected",
        "Bad receipt",
      ),
    ).rejects.toThrow("RPC failed");
  });
});

// ---------------------------------------------------------------------------
// fetchPendingOrderCount
// ---------------------------------------------------------------------------

describe("fetchPendingOrderCount", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("returns 0 when no user is authenticated", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await fetchPendingOrderCount(
      supabase as unknown as Parameters<typeof fetchPendingOrderCount>[0],
    );

    expect(result).toBe(0);
  });

  it("returns count from query", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "seller-1" } },
    });

    supabase._chain.in.mockResolvedValue({
      count: 5,
      error: null,
    });

    const result = await fetchPendingOrderCount(
      supabase as unknown as Parameters<typeof fetchPendingOrderCount>[0],
    );

    expect(result).toBe(5);
  });

  it("returns 0 on error", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "seller-1" } },
    });

    supabase._chain.in.mockResolvedValue({
      count: null,
      error: new Error("Count failed"),
    });

    const result = await fetchPendingOrderCount(
      supabase as unknown as Parameters<typeof fetchPendingOrderCount>[0],
    );

    expect(result).toBe(0);
  });
});
