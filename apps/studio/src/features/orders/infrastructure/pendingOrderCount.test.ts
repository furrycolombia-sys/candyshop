import { describe, it, expect, vi } from "vitest";

import { fetchPendingOrderCount } from "./pendingOrderCount";

describe("fetchPendingOrderCount", () => {
  it("returns 0 when user is not authenticated", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchPendingOrderCount(supabase as any);
    expect(result).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns count when query succeeds", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({ count: 5, error: null }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchPendingOrderCount(supabase as any);
    expect(result).toBe(5);
  });

  it("returns 0 when query errors", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              count: null,
              error: new Error("query failed"),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchPendingOrderCount(supabase as any);
    expect(result).toBe(0);
  });

  it("returns 0 when count is null", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({ count: null, error: null }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchPendingOrderCount(supabase as any);
    expect(result).toBe(0);
  });

  it("queries the correct table and filters", async () => {
    const inFn = vi.fn().mockReturnValue({ count: 3, error: null });
    const eqFn = vi.fn().mockReturnValue({ in: inFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    const fromFn = vi.fn().mockReturnValue({ select: selectFn });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "seller-1" } },
        }),
      },
      from: fromFn,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchPendingOrderCount(supabase as any);

    expect(fromFn).toHaveBeenCalledWith("orders");
    expect(selectFn).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(eqFn).toHaveBeenCalledWith("seller_id", "seller-1");
    expect(inFn).toHaveBeenCalledWith("payment_status", [
      "pending_verification",
      "evidence_requested",
    ]);
  });
});
