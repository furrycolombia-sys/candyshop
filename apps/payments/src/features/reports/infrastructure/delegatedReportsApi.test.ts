import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SellerReportFilters } from "@/features/reports/domain/types";

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  getReceiptUrl: vi.fn(async () => "https://signed/receipt.png"),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { fetchDelegatedReportOrders } from "./delegatedReportsApi";

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
  const auth = {
    getUser: vi.fn(async () => ({ data: { user: { id: "delegate-1" } } })),
  };
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
  return { auth, from: (t: keyof typeof datasets) => from(t) } as never;
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

  it("keeps only line items for delegated products and drops orders with none", async () => {
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
          total: 30,
          currency: "USD",
          transfer_number: "T1",
          receipt_url: "o1/receipt.png",
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
    expect(res.orders[0].id).toBe("o1");
    expect(res.orders[0].items).toHaveLength(1);
    expect(res.orders[0].items[0].product_id).toBe("p1");
    expect(res.orders[0].items[0].product_name).toBe("Delegated");
    expect(res.orders[0].buyer_email).toBe("buyer@example.com");
    expect(res.orders[0].receipt_url).toBe("https://signed/receipt.png");
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
    expect(res.orders[0].items).toHaveLength(1);
    expect(res.orders[0].items[0].product_id).toBe("p1");
  });
});
