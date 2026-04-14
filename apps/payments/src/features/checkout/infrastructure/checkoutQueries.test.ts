import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createOrder,
  fetchSellerPaymentMethods,
  fetchSellerProfiles,
  submitReceipt,
} from "./checkoutQueries";

import type { CartItem } from "@/features/checkout/domain/types";

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  _chain: MockChain;
}

function createMockSupabase(): MockSupabase {
  const chainable: MockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    from: vi.fn(() => chainable),
    rpc: vi.fn(),
    _chain: chainable,
  };
}

// ---------------------------------------------------------------------------
// fetchSellerPaymentMethods
// ---------------------------------------------------------------------------

describe("fetchSellerPaymentMethods", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("returns mapped payment methods on success", async () => {
    const rawData = [
      {
        id: "pm-1",
        name_en: "Bank Transfer",
        name_es: "Transferencia",
        display_blocks: [],
        form_fields: [],
        is_active: true,
      },
    ];

    supabase._chain.order.mockResolvedValue({ data: rawData, error: null });

    const result = await fetchSellerPaymentMethods(
      supabase as unknown as Parameters<typeof fetchSellerPaymentMethods>[0],
      "seller-1",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "pm-1",
      name_en: "Bank Transfer",
      name_es: "Transferencia",
      display_blocks: [],
      form_fields: [],
      is_active: true,
    });
  });

  it("throws on error", async () => {
    supabase._chain.order.mockResolvedValue({
      data: null,
      error: new Error("DB error"),
    });

    await expect(
      fetchSellerPaymentMethods(
        supabase as unknown as Parameters<typeof fetchSellerPaymentMethods>[0],
        "seller-1",
      ),
    ).rejects.toThrow("DB error");
  });

  it("returns empty array when data is null", async () => {
    supabase._chain.order.mockResolvedValue({ data: null, error: null });

    const result = await fetchSellerPaymentMethods(
      supabase as unknown as Parameters<typeof fetchSellerPaymentMethods>[0],
      "seller-1",
    );

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// submitReceipt
// ---------------------------------------------------------------------------

describe("submitReceipt", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("updates order with receipt info", async () => {
    supabase._chain.eq.mockResolvedValue({ error: null });

    await submitReceipt(
      supabase as unknown as Parameters<typeof submitReceipt>[0],
      "order-1",
      "TX-123",
      "path/to/receipt.png",
    );

    expect(supabase.from).toHaveBeenCalledWith("orders");
  });

  it("throws on error", async () => {
    supabase._chain.eq.mockResolvedValue({
      error: new Error("Update failed"),
    });

    await expect(
      submitReceipt(
        supabase as unknown as Parameters<typeof submitReceipt>[0],
        "order-1",
        "TX-123",
        null,
      ),
    ).rejects.toThrow("Update failed");
  });
});

// ---------------------------------------------------------------------------
// fetchSellerProfiles
// ---------------------------------------------------------------------------

describe("fetchSellerProfiles", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("returns empty object for empty sellerIds", async () => {
    const result = await fetchSellerProfiles(
      supabase as unknown as Parameters<typeof fetchSellerProfiles>[0],
      [],
    );
    expect(result).toEqual({});
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns map of seller profiles", async () => {
    supabase._chain.in.mockResolvedValue({
      data: [
        { id: "s1", display_name: "Alice", email: "alice@example.com" },
        { id: "s2", display_name: null, email: "bob@example.com" },
      ],
      error: null,
    });

    const result = await fetchSellerProfiles(
      supabase as unknown as Parameters<typeof fetchSellerProfiles>[0],
      ["s1", "s2"],
    );

    expect(result).toEqual({
      s1: "Alice",
      s2: "bob@example.com",
    });
  });

  it("throws on error", async () => {
    supabase._chain.in.mockResolvedValue({
      data: null,
      error: new Error("DB error"),
    });

    await expect(
      fetchSellerProfiles(
        supabase as unknown as Parameters<typeof fetchSellerProfiles>[0],
        ["s1"],
      ),
    ).rejects.toThrow("DB error");
  });
});

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

describe("createOrder", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  const mockItems: CartItem[] = [
    {
      id: "prod-1",
      name_en: "Widget",
      name_es: "Widget",
      price_cop: 5000,
      price_usd: 1.5,
      seller_id: "s1",
      quantity: 2,
      images: [],
      max_quantity: 10,
    },
  ];

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("reserves stock, inserts order and items, returns order id", async () => {
    // reserve_stock succeeds
    supabase.rpc.mockResolvedValue({ data: true, error: null });

    // insert order returns id
    supabase._chain.single.mockResolvedValue({
      data: { id: "order-new" },
      error: null,
    });

    // insert order_items succeeds (second call to from().insert())
    // We need to handle the second from() call for order_items
    const orderItemsChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    supabase.from.mockImplementation((table: string) => {
      if (table === "order_items") return orderItemsChain as never;
      return supabase._chain as never;
    });

    const result = await createOrder(
      supabase as unknown as Parameters<typeof createOrder>[0],
      {
        userId: "user-1",
        sellerId: "seller-1",
        paymentMethodId: "pm-1",
        items: mockItems,
        totalCop: 10_000,
        checkoutSessionId: "session-1",
      },
    );

    expect(result).toBe("order-new");
    expect(supabase.rpc).toHaveBeenCalledWith("reserve_stock", {
      p_product_id: "prod-1",
      p_quantity: 2,
    });
  });

  it("releases stock and throws on reserve_stock failure", async () => {
    // First rpc call succeeds, second fails (simulating two items)
    supabase.rpc
      .mockResolvedValueOnce({ data: true, error: null }) // first item ok
      .mockResolvedValueOnce({ data: false, error: null }); // second item fails

    const twoItems: CartItem[] = [
      ...mockItems,
      {
        id: "prod-2",
        name_en: "Gadget",
        name_es: "Gadget",
        price_cop: 3000,
        price_usd: 1,
        seller_id: "s1",
        quantity: 1,
        images: [],
        max_quantity: 5,
      },
    ];

    await expect(
      createOrder(supabase as unknown as Parameters<typeof createOrder>[0], {
        userId: "user-1",
        sellerId: "seller-1",
        paymentMethodId: "pm-1",
        items: twoItems,
        totalCop: 13_000,
        checkoutSessionId: "session-1",
      }),
    ).rejects.toThrow("stock_error");

    // Should have called release_stock for the first item that was reserved
    expect(supabase.rpc).toHaveBeenCalledWith("release_stock", {
      p_product_id: "prod-1",
      p_quantity: 2,
    });
  });
});
