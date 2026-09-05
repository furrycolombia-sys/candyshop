import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const ADMIN_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const TARGET_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const ROW_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const ok = (json: unknown) =>
  ({ ok: true, json: async () => json }) as Response;

const grantRow = (key: string) => ({
  expires_at: null,
  mode: "grant",
  resource_permission_id: `${key}-rp`,
  resource_permissions: { permissions: { key } },
});

async function loadRoute(signedIn = true) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();

  const routeModule =
    await import("@/app/api/admin/users/[userId]/delegates/route");
  const supabaseModule = await import("api/supabase/server");

  vi.mocked(supabaseModule.createServerSupabaseClient).mockResolvedValue({
    rpc: vi
      .fn()
      .mockResolvedValue({ data: signedIn ? ADMIN_ID : null, error: null }),
  } as unknown as Awaited<
    ReturnType<typeof supabaseModule.createServerSupabaseClient>
  >);

  return routeModule;
}

const params = (userId = TARGET_ID) => ({
  params: Promise.resolve({ userId }),
});

const del = (body: unknown) =>
  new Request("http://localhost/api/admin/users/x/delegates", {
    method: "DELETE",
    body: JSON.stringify(body),
  });

function mockCallerPermissions(...keys: string[]) {
  vi.mocked(fetch).mockResolvedValueOnce(ok(keys.map((k) => grantRow(k))));
}

/** The URL the route handed to fetch for the delete. */
const deleteUrl = () => String(vi.mocked(fetch).mock.calls.at(-1)?.[0]);

describe("admin users/[userId]/delegates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("GET", () => {
    it("refuses a caller without the read permission", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("orders.approve");

      const response = await GET(new Request("http://localhost"), params());
      expect(response.status).toBe(403);
    });

    it("returns both sides of the relationship", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("seller_admins.read");
      vi.mocked(fetch)
        .mockResolvedValueOnce(ok([{ id: "as-seller" }]))
        .mockResolvedValueOnce(ok([{ id: "as-delegate" }]));

      const response = await GET(new Request("http://localhost"), params());
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        asSeller: [{ id: "as-seller" }],
        asDelegate: [{ id: "as-delegate" }],
      });
    });

    // A bad id in the path is the caller's mistake. The bare catch reported it
    // as 500 "Failed to load delegates", indistinguishable from an outage.
    it("reports a non-uuid path id as a client error", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("seller_admins.read");

      const response = await GET(
        new Request("http://localhost"),
        params("not-a-uuid"),
      );
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("refuses a caller without seller_admins.delete", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.read");

      const response = await DELETE(del({ delegateRowId: ROW_ID }), params());
      expect(response.status).toBe(403);
    });

    it("rejects a payload with no delegateRowId", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.delete");

      const response = await DELETE(del({}), params());
      expect(response.status).toBe(400);
    });

    it("reports a non-uuid row id as a client error", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.delete");

      const response = await DELETE(del({ delegateRowId: "nope" }), params());
      expect(response.status).toBe(400);
    });

    it("removes the row and reports success", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.delete");
      vi.mocked(fetch).mockResolvedValueOnce(ok([{ id: ROW_ID }]));

      const response = await DELETE(del({ delegateRowId: ROW_ID }), params());
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
    });

    // The path used to be decorative: :userId was awaited and discarded, so
    // any row id was deleted regardless of whose delegates the URL named.
    it("scopes the delete to the user in the path", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.delete");
      vi.mocked(fetch).mockResolvedValueOnce(ok([{ id: ROW_ID }]));

      await DELETE(del({ delegateRowId: ROW_ID }), params());

      const url = deleteUrl();
      expect(url).toContain(`id=eq.${ROW_ID}`);
      expect(url).toContain(
        `or=(seller_id.eq.${TARGET_ID},admin_user_id.eq.${TARGET_ID})`,
      );
    });

    it("reports a row that does not belong to the user as not removed", async () => {
      const { DELETE } = await loadRoute();
      mockCallerPermissions("seller_admins.delete");
      vi.mocked(fetch).mockResolvedValueOnce(ok([]));

      const response = await DELETE(del({ delegateRowId: ROW_ID }), params());
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringContaining("not found"),
      });
    });
  });
});
