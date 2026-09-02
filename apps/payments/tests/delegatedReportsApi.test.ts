import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchDelegatedReportOrders } from "@/features/reports/infrastructure/delegatedReportsApi";

import type { SellerReportFilters } from "@/features/reports/domain/types";

const NO_FILTERS: SellerReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

// Minimal chainable Supabase stub. Each table returns a canned dataset.
function makeSupabase(datasets: {
  seller_admins: unknown[];
  orders: unknown[];
  user_profiles: unknown[];
}) {
  const rpc = vi.fn(async () => ({ data: "delegate-1", error: null }));
  function from(table: keyof typeof datasets) {
    const rows = datasets[table];
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      // eslint-disable-next-line unicorn/no-thenable -- minimal thenable stub so any point in the chain can be awaited
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    };
    return builder;
  }
  return { rpc, from: (t: keyof typeof datasets) => from(t) } as never;
}

describe("fetchDelegatedReportOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty result when the user has no delegations granting reports.read", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["orders.approve"] },
      ],
      orders: [],
      user_profiles: [],
    });
    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);
    expect(res.orders).toEqual([]);
    expect(res.total).toBe(0);
  });

  it("computes a product-scoped subtotal, keeps only delegated items, and never exposes receipt/transfer fields", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 1_000_000,
          currency: "USD",
          transfer_number: "T1",
          receipt_url: "o1/receipt.png",
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 2,
              unit_price: 25_000,
              currency: "USD",
              products: { name_en: "Delegated" },
            },
            {
              id: "i2",
              product_id: "p2",
              quantity: 5,
              unit_price: 100_000,
              currency: "USD",
              products: { name_en: "Other" },
            },
          ],
        },
        {
          id: "o2",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-02T00:00:00Z",
          payment_status: "approved",
          total: 20,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          order_items: [
            {
              id: "i3",
              product_id: "p2",
              quantity: 2,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Other" },
            },
          ],
        },
      ],
      user_profiles: [
        { id: "b1", email: "buyer@example.com", display_name: "Buyer One" },
      ],
    });

    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);

    expect(res.total).toBe(1);
    expect(res.orders).toHaveLength(1);
    const order = res.orders[0]!;
    expect(order.id).toBe("o1");
    expect(order.delegated_subtotal).toBe(50_000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.product_id).toBe("p1");
    expect(order.items[0]!.product_name).toBe("Delegated");
    expect(order.buyer_email).toBe("buyer@example.com");
    expect("receipt_url" in order).toBe(false);
    expect("transfer_number" in order).toBe(false);
    expect("total" in order).toBe(false);
  });

  it("only includes items for products granted reports.read, even when the same seller has another delegation row without it", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
        { seller_id: "s1", product_id: "p2", permissions: ["orders.approve"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 30,
          currency: "USD",
          transfer_number: "T1",
          receipt_url: null,
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 1,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Delegated" },
            },
            {
              id: "i2",
              product_id: "p2",
              quantity: 2,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Not Delegated" },
            },
          ],
        },
      ],
      user_profiles: [
        { id: "b1", email: "buyer@example.com", display_name: "Buyer One" },
      ],
    });

    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);

    expect(res.orders).toHaveLength(1);
    expect(res.orders[0]!.items).toHaveLength(1);
    expect(res.orders[0]!.items[0]!.product_id).toBe("p1");
  });

  it("drops orders with no delegated items", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 20,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          order_items: [
            {
              id: "i3",
              product_id: "p2",
              quantity: 2,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Other" },
            },
          ],
        },
      ],
      user_profiles: [],
    });

    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);

    expect(res.orders).toEqual([]);
    expect(res.total).toBe(0);
  });

  it("applies amountMin/amountMax against the delegated subtotal (app-side), not the order total", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 1_000_000,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 2,
              unit_price: 25_000,
              currency: "USD",
              products: { name_en: "Delegated" },
            },
          ],
        },
      ],
      user_profiles: [
        { id: "b1", email: "buyer@example.com", display_name: "Buyer One" },
      ],
    });

    const excluded = await fetchDelegatedReportOrders(supabase, {
      ...NO_FILTERS,
      amountMin: 60_000,
    });
    expect(excluded.orders).toEqual([]);
    expect(excluded.total).toBe(0);

    const included = await fetchDelegatedReportOrders(supabase, {
      ...NO_FILTERS,
      amountMin: 40_000,
      amountMax: 60_000,
    });
    expect(included.orders).toHaveLength(1);
    expect(included.orders[0]!.delegated_subtotal).toBe(50_000);
  });

  it("returns empty when there is no authenticated user", async () => {
    const supabase = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
      from: vi.fn(),
    } as never;
    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);
    expect(res).toEqual({ orders: [], total: 0 });
  });

  it("applies date, status, buyer, and currency filters at the query level", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-06-15T00:00:00Z",
          payment_status: "approved",
          total: 100,
          currency: "USD",
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 1,
              unit_price: 25_000,
              currency: "USD",
              products: { name_en: "Delegated" },
            },
          ],
        },
      ],
      user_profiles: [
        { id: "b1", email: "buyer@example.com", display_name: "Buyer One" },
      ],
    });

    const res = await fetchDelegatedReportOrders(supabase, {
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      status: "approved",
      buyerId: "b1",
      currency: "usd",
      amountMin: null,
      amountMax: null,
    });

    expect(res.orders).toHaveLength(1);
    expect(res.orders[0]!.delegated_subtotal).toBe(25_000);
  });

  it("falls back gracefully when product name, buyer profile, or permissions are missing", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
        // permissions null → must be skipped via the `?? []` fallback
        { seller_id: "s2", product_id: "p9", permissions: null },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "bX",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 100,
          currency: "USD",
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 1,
              unit_price: 10,
              currency: "USD",
              // products null → product_name falls back to product_id
              products: null,
            },
          ],
        },
      ],
      // no profile for bX → buyer_email "" and buyer_display_name null
      user_profiles: [],
    });

    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);

    expect(res.orders).toHaveLength(1);
    expect(res.orders[0]!.items[0]!.product_name).toBe("p1");
    expect(res.orders[0]!.buyer_email).toBe("");
    expect(res.orders[0]!.buyer_display_name).toBeNull();
  });
});
