import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadReceiptMock } = vi.hoisted(() => ({
  uploadReceiptMock: vi.fn(
    async (_supabase: unknown, file: File, orderId: string) =>
      `${orderId}/${file.name}`,
  ),
}));

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  getReceiptUrl: vi.fn(
    async (_supabase: unknown, storagePath: string | null) =>
      storagePath ? `https://example.com/${storagePath}` : null,
  ),
  uploadReceipt: uploadReceiptMock,
}));

import { fetchMyOrders, resubmitEvidence } from "./orderQueries";

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn(() => chain),
    auth: {
      getUser: vi.fn(),
    },
    _chain: chain,
  };
}

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

    supabase._chain.order.mockResolvedValueOnce({
      data: [
        {
          id: "o1",
          user_id: "user-1",
          seller_id: "s1",
          payment_status: "approved",
          total_cop: 10_000,
          transfer_number: "TX-1",
          receipt_url: "order-1/receipt.png",
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
    expect(result[0].receipt_url).toBe(
      "https://example.com/order-1/receipt.png",
    );
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

describe("resubmitEvidence", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
    uploadReceiptMock.mockClear();
  });

  it("updates order without receipt upload when no file provided", async () => {
    supabase._chain.eq
      .mockReturnValueOnce(supabase._chain)
      .mockResolvedValueOnce({ error: null });

    await resubmitEvidence(
      supabase as unknown as Parameters<typeof resubmitEvidence>[0],
      "order-1",
      "TX-999",
      null,
    );

    expect(supabase.from).toHaveBeenCalledWith("orders");
    expect(uploadReceiptMock).not.toHaveBeenCalled();
  });

  it("uploads receipt then updates order when file is provided", async () => {
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

    expect(uploadReceiptMock).toHaveBeenCalledWith(supabase, file, "order-1");
    expect(supabase.from).toHaveBeenCalledWith("orders");
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
