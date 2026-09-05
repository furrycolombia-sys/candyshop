import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const ADMIN_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const TARGET_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const PERMISSION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const RESOURCE_PERMISSION_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14";

const ok = (json: unknown) =>
  ({ ok: true, json: async () => json }) as Response;

/** A permission row as `getEffectivePermissionKeys` expects it. */
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
    await import("@/app/api/admin/users/[userId]/permissions/route");
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

const post = (body: unknown) =>
  new Request("http://localhost/api/admin/users/x/permissions", {
    method: "POST",
    body: JSON.stringify(body),
  });

const put = (body: unknown) =>
  new Request("http://localhost/api/admin/users/x/permissions", {
    method: "PUT",
    body: JSON.stringify(body),
  });

/** The caller's own permission lookup, which every handler does first. */
function mockCallerPermissions(...keys: string[]) {
  vi.mocked(fetch).mockResolvedValueOnce(ok(keys.map((k) => grantRow(k))));
}

describe("admin users/[userId]/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("GET", () => {
    it("refuses a caller without user_permissions.read", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("orders.approve");

      const response = await GET(new Request("http://localhost"), params());
      expect(response.status).toBe(403);
    });

    it("refuses a caller with no session", async () => {
      const { GET } = await loadRoute(false);

      const response = await GET(new Request("http://localhost"), params());
      expect(response.status).toBe(403);
    });

    it("returns the target user's granted keys", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("user_permissions.read");
      vi.mocked(fetch).mockResolvedValueOnce(
        ok([grantRow("orders.approve"), grantRow("orders.request_proof")]),
      );

      const response = await GET(new Request("http://localhost"), params());
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        grantedKeys: ["orders.approve", "orders.request_proof"],
      });
    });

    it("rejects a target id that is not a uuid", async () => {
      const { GET } = await loadRoute();
      mockCallerPermissions("user_permissions.read");

      const response = await GET(
        new Request("http://localhost"),
        params("not-a-uuid"),
      );
      expect(response.status).toBe(400);
    });
  });

  describe("POST", () => {
    it("rejects a payload with no permissionKey", async () => {
      const { POST } = await loadRoute();
      const response = await POST(post({ grant: true }), params());
      expect(response.status).toBe(400);
    });

    it("rejects a payload whose grant is not a boolean", async () => {
      const { POST } = await loadRoute();
      const response = await POST(
        post({ permissionKey: "orders.approve", grant: "yes" }),
        params(),
      );
      expect(response.status).toBe(400);
    });

    it("granting requires user_permissions.create", async () => {
      const { POST } = await loadRoute();
      mockCallerPermissions("user_permissions.delete");

      const response = await POST(
        post({ permissionKey: "orders.approve", grant: true }),
        params(),
      );
      expect(response.status).toBe(403);
    });

    it("revoking requires user_permissions.delete", async () => {
      const { POST } = await loadRoute();
      mockCallerPermissions("user_permissions.create");

      const response = await POST(
        post({ permissionKey: "orders.approve", grant: false }),
        params(),
      );
      expect(response.status).toBe(403);
    });

    it("grants a permission", async () => {
      const { POST } = await loadRoute();
      mockCallerPermissions("user_permissions.create");
      vi.mocked(fetch)
        .mockResolvedValueOnce(ok([{ id: PERMISSION_ID }]))
        .mockResolvedValueOnce(
          ok([{ id: RESOURCE_PERMISSION_ID, resource_id: null }]),
        )
        .mockResolvedValueOnce(ok([]));

      const response = await POST(
        post({ permissionKey: "orders.approve", grant: true }),
        params(),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });

    // An unknown key is the caller's mistake. It used to reach the generic
    // catch and come back as 500 "Failed to update permission", which cannot
    // be told apart from an outage either by the caller or in monitoring.
    it("reports an unknown permission key as a client error", async () => {
      const { POST } = await loadRoute();
      mockCallerPermissions("user_permissions.create");
      vi.mocked(fetch).mockResolvedValueOnce(ok([]));

      const response = await POST(
        post({ permissionKey: "not.a.real.permission", grant: true }),
        params(),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringContaining("not.a.real.permission"),
      });
    });
  });

  describe("PUT", () => {
    it("requires both create and delete", async () => {
      const { PUT } = await loadRoute();
      mockCallerPermissions("user_permissions.create");

      const response = await PUT(
        put({ permissionKeys: ["orders.approve"] }),
        params(),
      );
      expect(response.status).toBe(403);
    });

    it("rejects a payload whose permissionKeys is not an array", async () => {
      const { PUT } = await loadRoute();
      mockCallerPermissions(
        "user_permissions.create",
        "user_permissions.delete",
      );

      const response = await PUT(put({ permissionKeys: "all" }), params());
      expect(response.status).toBe(400);
    });
  });
});
