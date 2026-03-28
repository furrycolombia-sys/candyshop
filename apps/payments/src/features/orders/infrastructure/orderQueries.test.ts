import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchMyOrders, resubmitEvidence } from "./orderQueries";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  const storageChain = {
    upload: vi.fn(),
  };

  return {
    from: vi.fn(() => chain),
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => storageChain),
    },
    _chain: chain,
    _storageChain: storageChain,
  };
}

// ---------------------------------------------------------------------------
// fetchMyOrders
// ---------------------------------------------------------------------------

describe("fetchMyOrders", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("throws when not authenticated", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    await expect(
      fetchMyOrders(supabase as unknown as Parameters<typeof fetchMyOrders>[0]),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when auth returns no user and no error", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      fetchMyOrders(supabase as unknown as Parameters<typeof fetchMyOrders>[0]),
    ).rejects.toThrow("Not authenticated");
  });

  it("returns orders with seller names", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // orders query
    supabase._chain.order.mockResolvedValueOnce({
      data: [
        {
          id: "o1",
          user_id: "user-1",
          seller_id: "s1",
          payment_status: "approved",
          total_cop: 10_000,
          transfer_number: "TX-1",
          receipt_url: null,
          seller_note: null,
          expires_at: null,
          checkout_session_id: "sess-1",
          created_at: "2026-01-01T00:00:00Z",
          payment_method_id: "pm-1",
          order_items: [
            {
              id: "oi1",
              product_id: "p1",
              quantity: 2,
              unit_price_cop: 5000,
              metadata: { name_en: "Widget" },
            },
          ],
        },
      ],
      error: null,
    });

    // user_profiles query for seller names
    supabase._chain.in.mockResolvedValueOnce({
      data: [{ id: "s1", display_name: "Seller One", email: "s1@example.com" }],
      error: null,
    });

    const result = await fetchMyOrders(
      supabase as unknown as Parameters<typeof fetchMyOrders>[0],
    );

    expect(result).toHaveLength(1);
    expect(result[0].seller_name).toBe("Seller One");
    expect(result[0].items).toHaveLength(1);
  });

  it("throws on query error", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    supabase._chain.order.mockResolvedValue({
      data: null,
      error: new Error("Query failed"),
    });

    await expect(
      fetchMyOrders(supabase as unknown as Parameters<typeof fetchMyOrders>[0]),
    ).rejects.toThrow("Query failed");
  });
});

// ---------------------------------------------------------------------------
// resubmitEvidence
// ---------------------------------------------------------------------------

describe("resubmitEvidence", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("updates order without receipt upload when no file provided", async () => {
    // The eq chain resolves at the second eq call
    supabase._chain.eq
      .mockReturnValueOnce(supabase._chain) // first .eq("id", orderId)
      .mockResolvedValueOnce({ error: null }); // second .eq("payment_status", ...)

    await resubmitEvidence(
      supabase as unknown as Parameters<typeof resubmitEvidence>[0],
      "order-1",
      "TX-999",
      null,
    );

    expect(supabase.from).toHaveBeenCalledWith("orders");
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("uploads receipt then updates order when file is provided", async () => {
    supabase._storageChain.upload.mockResolvedValue({ error: null });
    supabase._chain.eq
      .mockReturnValueOnce(supabase._chain)
      .mockResolvedValueOnce({ error: null });

    const file = new File(["data"], "receipt.jpg", { type: "image/jpeg" });

    await resubmitEvidence(
      supabase as unknown as Parameters<typeof resubmitEvidence>[0],
      "order-1",
      "TX-999",
      file,
    );

    expect(supabase.storage.from).toHaveBeenCalledWith("receipts");
    expect(supabase._storageChain.upload).toHaveBeenCalledWith(
      "order-1/receipt.jpg",
      file,
      { upsert: true },
    );
  });

  it("throws on upload error", async () => {
    supabase._storageChain.upload.mockResolvedValue({
      error: new Error("Upload failed"),
    });

    const file = new File(["data"], "receipt.jpg", { type: "image/jpeg" });

    await expect(
      resubmitEvidence(
        supabase as unknown as Parameters<typeof resubmitEvidence>[0],
        "order-1",
        "TX-999",
        file,
      ),
    ).rejects.toThrow("Upload failed");
  });

  it("throws on order update error", async () => {
    supabase._chain.eq
      .mockReturnValueOnce(supabase._chain)
      .mockResolvedValueOnce({ error: new Error("Update failed") });

    await expect(
      resubmitEvidence(
        supabase as unknown as Parameters<typeof resubmitEvidence>[0],
        "order-1",
        "TX-999",
        null,
      ),
    ).rejects.toThrow("Update failed");
  });
});
