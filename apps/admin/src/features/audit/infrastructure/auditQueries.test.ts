import { http, HttpResponse } from "msw";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/infrastructure/config/environment", () => ({
  supabaseUrl: "http://127.0.0.1:54321",
}));

const SUPABASE_URL = "http://127.0.0.1:54321";

import { fetchAuditLog, fetchAuditTableNames } from "./auditQueries";

import { server } from "@/mocks/server";

// Fake supabase client with auth.getUser + auth.getSession
function createMockSupabase(token?: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: token ? { id: "user-123" } : null,
        },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: token ? { access_token: token } : null,
        },
      }),
    },
  } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  >;
}

describe("fetchAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fetches audit log entries and returns them", async () => {
    const mockData = [{ event_id: 1, table_name: "users" }];
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/logged_actions_with_user`, () =>
        HttpResponse.json(mockData),
      ),
    );

    const supabase = createMockSupabase("user-token");
    const result = await fetchAuditLog(supabase);

    expect(result).toEqual(mockData);
  });

  it("includes table_name filter when provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditLog(supabase, { tableName: "users" });

    expect(capturedUrl).toContain("table_name=eq.users");
  });

  it("includes action_type filter when provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditLog(supabase, { actionType: "INSERT" });

    expect(capturedUrl).toContain("action_type=eq.INSERT");
  });

  it("uses the offset parameter", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditLog(supabase, {}, 100);

    expect(capturedUrl).toContain("offset=100");
  });

  it("throws when response is not ok", async () => {
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const supabase = createMockSupabase("token");
    await expect(fetchAuditLog(supabase)).rejects.toThrow(
      "Audit REST query failed: 500",
    );
  });
});

describe("fetchAuditTableNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns unique table names", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/logged_actions_with_user`, () =>
        HttpResponse.json([
          { table_name: "users" },
          { table_name: "orders" },
          { table_name: "users" },
        ]),
      ),
    );

    const supabase = createMockSupabase("token");
    const result = await fetchAuditTableNames(supabase);

    expect(result).toEqual(["users", "orders"]);
  });

  it("requests only table_name column", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditTableNames(supabase);

    expect(capturedUrl).toContain("select=table_name");
  });
});

describe("fetchAuditLog — branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("omits table_name param when tableName contains only non-word chars", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditLog(supabase, { tableName: "---" });

    expect(capturedUrl).not.toContain("table_name");
  });

  it("omits action_type param when actionType is not in AUDIT_ACTION_TYPES", async () => {
    let capturedUrl = "";
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        },
      ),
    );

    const supabase = createMockSupabase("token");
    await fetchAuditLog(supabase, { actionType: "INVALID_ACTION" });

    expect(capturedUrl).not.toContain("action_type");
  });
});

describe("insertAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function createSessionSupabase(token?: string) {
    return {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: token
              ? { access_token: token, user: { id: "user-123" } }
              : null,
          },
        }),
      },
    } as unknown as ReturnType<
      typeof import("api/supabase").createBrowserSupabaseClient
    >;
  }

  it("POSTs to logged_actions and resolves on success", async () => {
    let capturedRequest: Request | null = null;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/logged_actions`, ({ request }) => {
        capturedRequest = request;
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const supabase = createSessionSupabase("my-token");
    const { insertAuditLog } = await import("./auditQueries");
    await insertAuditLog(supabase, "INSERT", "products", { id: "1" });

    expect(capturedRequest).not.toBeNull();
    const body = await (capturedRequest as Request).json();
    expect(body.action_type).toBe("INSERT");
    expect(body.table_name).toBe("products");
    expect(body.row_data).toEqual({ id: "1" });
  });

  it("throws Unauthenticated when session has no token", async () => {
    const supabase = createSessionSupabase();
    const { insertAuditLog } = await import("./auditQueries");
    await expect(
      insertAuditLog(supabase, "INSERT", "products"),
    ).rejects.toThrow("Unauthenticated");
  });

  it("throws when the POST response is not ok", async () => {
    server.use(
      http.post(
        `${SUPABASE_URL}/rest/v1/logged_actions`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const supabase = createSessionSupabase("my-token");
    const { insertAuditLog } = await import("./auditQueries");
    await expect(
      insertAuditLog(supabase, "INSERT", "products"),
    ).rejects.toThrow("Audit insert failed: 500");
  });
});
