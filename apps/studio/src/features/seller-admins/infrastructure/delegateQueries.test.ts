import { describe, it, expect, vi } from "vitest";

import {
  fetchDelegates,
  searchUsers,
  escapeLikePattern,
} from "./delegateQueries";

/* ------------------------------------------------------------------ */
/*  Supabase mock helpers                                              */
/* ------------------------------------------------------------------ */

function createMockSupabase(overrides: {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}) {
  const { data = [], error = null } = overrides;

  const resolved = Promise.resolve({ data, error });

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

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
/*  escapeLikePattern                                                  */
/* ------------------------------------------------------------------ */

describe("escapeLikePattern", () => {
  it("escapes % wildcard", () => {
    expect(escapeLikePattern("50%")).toBe(String.raw`50\%`);
  });

  it("escapes _ wildcard", () => {
    expect(escapeLikePattern("user_name")).toBe(String.raw`user\_name`);
  });

  it("escapes backslash", () => {
    expect(escapeLikePattern(String.raw`path\to`)).toBe(String.raw`path\\to`);
  });

  it("returns plain strings unchanged", () => {
    expect(escapeLikePattern("hello")).toBe("hello");
  });

  it("escapes multiple special characters", () => {
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });
});

/* ------------------------------------------------------------------ */
/*  fetchDelegates                                                     */
/* ------------------------------------------------------------------ */

describe("fetchDelegates", () => {
  it("returns delegates from supabase", async () => {
    const mockDelegates = [
      {
        id: "d1",
        seller_id: "seller-1",
        admin_user_id: "admin-1",
        permissions: ["orders.approve"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        admin_profile: {
          id: "admin-1",
          email: "admin@test.com",
          display_name: "Admin",
          avatar_url: null,
        },
      },
    ];

    const supabase = createMockSupabase({ data: mockDelegates });
    const result = await fetchDelegates(supabase, "seller-1");

    expect(result).toEqual(mockDelegates);
    expect(supabase.from).toHaveBeenCalledWith("seller_admins");
  });

  it("queries with correct seller_id filter", async () => {
    const supabase = createMockSupabase({ data: [] });
    await fetchDelegates(supabase, "seller-42");

    expect(supabase._chain.eq).toHaveBeenCalledWith("seller_id", "seller-42");
  });

  it("orders results by created_at ascending", async () => {
    const supabase = createMockSupabase({ data: [] });
    await fetchDelegates(supabase, "seller-1");

    expect(supabase._chain.order).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("throws on supabase error", async () => {
    const supabase = createMockSupabase({
      error: { message: "RLS violation" },
    });

    await expect(fetchDelegates(supabase, "seller-1")).rejects.toEqual({
      message: "RLS violation",
    });
  });

  it("returns empty array when no delegates exist", async () => {
    const supabase = createMockSupabase({ data: [] });
    const result = await fetchDelegates(supabase, "seller-1");

    expect(result).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  searchUsers                                                        */
/* ------------------------------------------------------------------ */

describe("searchUsers", () => {
  it("returns matching user profiles", async () => {
    const mockUsers = [
      {
        id: "u1",
        email: "alice@test.com",
        display_name: "Alice",
        avatar_url: null,
      },
    ];

    const supabase = createMockSupabase({ data: mockUsers });
    const result = await searchUsers(supabase, "alice", "exclude-id");

    expect(result).toEqual(mockUsers);
  });

  it("excludes the seller's own profile", async () => {
    const supabase = createMockSupabase({ data: [] });
    await searchUsers(supabase, "test", "my-id");

    expect(supabase._chain.neq).toHaveBeenCalledWith("id", "my-id");
  });

  it("returns empty array for empty/whitespace query", async () => {
    const supabase = createMockSupabase({ data: [] });

    expect(await searchUsers(supabase, "", "id")).toEqual([]);
    expect(await searchUsers(supabase, "   ", "id")).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("sanitizes LIKE wildcards in the query", async () => {
    const supabase = createMockSupabase({ data: [] });
    await searchUsers(supabase, "50%_off", "id");

    expect(supabase._chain.or).toHaveBeenCalledWith(
      String.raw`email.ilike.%50\%\_off%,display_name.ilike.%50\%\_off%`,
    );
  });

  it("limits results to 10", async () => {
    const supabase = createMockSupabase({ data: [] });
    await searchUsers(supabase, "test", "id");

    expect(supabase._chain.limit).toHaveBeenCalledWith(10);
  });

  it("throws on supabase error", async () => {
    const supabase = createMockSupabase({
      error: { message: "connection error" },
    });

    await expect(searchUsers(supabase, "test", "id")).rejects.toEqual({
      message: "connection error",
    });
  });
});
