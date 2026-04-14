import { describe, it, expect, vi } from "vitest";

import { executeDelegateAction } from "./delegatedOrderActions";

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

  const fromCalls: string[] = [];

  const from = vi.fn().mockImplementation((table: string) => {
    fromCalls.push(table);
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
      update: vi.fn(),
    };

    const chainable = Object.assign(resolved, chain);
    for (const key of Object.keys(chain)) {
      chain[key].mockReturnValue(chainable);
    }

    return chainable;
  });

  return {
    from,
    _fromCalls: fromCalls,
  } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  > & { _fromCalls: string[] };
}

/* ------------------------------------------------------------------ */
/*  executeDelegateAction — approve                                    */
/* ------------------------------------------------------------------ */

describe("executeDelegateAction — approve", () => {
  it("approves an order when delegate has permission", async () => {
    const supabase = createSequentialMockSupabase([
      // Step 1: fetch order
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      // Step 2: fetch delegation
      { data: { permissions: ["orders.approve"] } },
      // Step 3: update order
      { data: null },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "approve",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when order is not found", async () => {
    const supabase = createSequentialMockSupabase([
      { data: null, error: { message: "not found" } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "missing",
        action: "approve",
      }),
    ).rejects.toThrow("Order not found");
  });

  it("throws when order is not in an actionable state", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "approved",
        },
      },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "approve",
      }),
    ).rejects.toThrow("Order is not in an actionable state");
  });

  it("throws when no delegation exists", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: null, error: { message: "no rows" } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "approve",
      }),
    ).rejects.toThrow("No delegation found for this seller");
  });

  it("throws when delegate lacks the required permission", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: { permissions: ["orders.request_proof"] } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "approve",
      }),
    ).rejects.toThrow("Missing required permission: orders.approve");
  });
});

/* ------------------------------------------------------------------ */
/*  executeDelegateAction — request_proof                               */
/* ------------------------------------------------------------------ */

describe("executeDelegateAction — request_proof", () => {
  it("requests proof with a seller note", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: { permissions: ["orders.request_proof"] } },
      { data: null },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "request_proof",
        seller_note: "Please upload a clearer receipt",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when seller_note is empty", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: { permissions: ["orders.request_proof"] } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "request_proof",
        seller_note: "",
      }),
    ).rejects.toThrow("Seller note is required when requesting proof");
  });

  it("throws when seller_note is missing", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: { permissions: ["orders.request_proof"] } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "request_proof",
      }),
    ).rejects.toThrow("Seller note is required when requesting proof");
  });

  it("throws when seller_note is only whitespace", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "pending_verification",
        },
      },
      { data: { permissions: ["orders.request_proof"] } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "request_proof",
        seller_note: "   ",
      }),
    ).rejects.toThrow("Seller note is required when requesting proof");
  });

  it("throws when delegate lacks request_proof permission", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "evidence_requested",
        },
      },
      { data: { permissions: ["orders.approve"] } },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "request_proof",
        seller_note: "Need more info",
      }),
    ).rejects.toThrow("Missing required permission: orders.request_proof");
  });

  it("works on evidence_requested orders too", async () => {
    const supabase = createSequentialMockSupabase([
      {
        data: {
          id: "order-1",
          seller_id: "seller-1",
          payment_status: "evidence_requested",
        },
      },
      { data: { permissions: ["orders.approve"] } },
      { data: null },
    ]);

    await expect(
      executeDelegateAction(supabase, "delegate-1", {
        orderId: "order-1",
        action: "approve",
      }),
    ).resolves.toBeUndefined();
  });
});
