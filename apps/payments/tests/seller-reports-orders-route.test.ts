import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const SELLER_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";

async function loadRoute(signedIn = true) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();

  const routeModule = await import("@/app/api/seller/reports/orders/route");
  const supabaseModule = await import("api/supabase/server");

  vi.mocked(supabaseModule.createServerSupabaseClient).mockResolvedValue({
    rpc: vi
      .fn()
      .mockResolvedValue({ data: signedIn ? SELLER_ID : null, error: null }),
  } as unknown as Awaited<
    ReturnType<typeof supabaseModule.createServerSupabaseClient>
  >);

  return routeModule.GET;
}

const makeRequest = (qs: string) =>
  new Request(`http://localhost/api/seller/reports/orders?${qs}`);

/** The orders query URL that the route handed to fetch. */
function ordersUrl() {
  const call = vi.mocked(fetch).mock.calls[0];
  return String(call?.[0]);
}

describe("GET /api/seller/reports/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] } as Response),
    );
  });

  it("scopes the query to the signed-in seller", async () => {
    const GET = await loadRoute();
    await GET(makeRequest(""));
    expect(ordersUrl()).toContain(`seller_id=eq.${SELLER_ID}`);
  });

  it("rejects requests with no signed-in session", async () => {
    const GET = await loadRoute(false);
    const response = await GET(makeRequest(""));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid date", async () => {
    const GET = await loadRoute();
    const response = await GET(makeRequest("dateFrom=not-a-date"));
    expect(response.status).toBe(400);
  });

  it("rejects an unknown status", async () => {
    const GET = await loadRoute();
    const response = await GET(makeRequest("status=whatever"));
    expect(response.status).toBe(400);
  });

  it("applies a lone date bound", async () => {
    const GET = await loadRoute();
    await GET(makeRequest("dateFrom=2026-01-01"));
    expect(ordersUrl()).toContain("created_at=gte.2026-01-01");
  });

  // PostgREST expresses a range by repeating the column. A JS object cannot
  // hold the same key twice, and the route worked around that with a
  // `created_at_lte` key -- a column `orders` does not have, so the filter
  // either errors or drops the upper bound. createRestPath already accepts an
  // array and appends repeated keys, which is the idiom that works.
  it("sends both date bounds as repeated created_at filters", async () => {
    const GET = await loadRoute();
    await GET(makeRequest("dateFrom=2026-01-01&dateTo=2026-01-31"));

    const url = ordersUrl();
    expect(url).not.toContain("created_at_lte");
    expect(url).toContain("created_at=gte.2026-01-01");
    expect(url).toContain("created_at=lte.2026-01-31T23%3A59%3A59");
  });

  it("sends both amount bounds as repeated total filters", async () => {
    const GET = await loadRoute();
    await GET(makeRequest("amountMin=10&amountMax=100"));

    const url = ordersUrl();
    expect(url).not.toContain("total_lte");
    expect(url).toContain("total=gte.10");
    expect(url).toContain("total=lte.100");
  });
});
