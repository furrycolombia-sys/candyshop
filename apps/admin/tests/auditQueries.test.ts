import { http, HttpResponse } from "msw";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/infrastructure/config/environment", () => ({
  supabaseUrl: "http://127.0.0.1:54321",
}));

const mockGetSupabaseAccessToken = vi.fn();
vi.mock("api/supabase/browser", () => ({
  getSupabaseAccessToken: () => mockGetSupabaseAccessToken(),
}));

const mockGetCurrentUserId = vi.fn();
vi.mock("api/supabase", () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...args),
}));

const SUPABASE_URL = "http://127.0.0.1:54321";

import {
  fetchAuditLog,
  fetchAuditTableNames,
} from "@/features/audit/infrastructure/auditQueries";

import { server } from "@/mocks/server";

describe("fetchAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockGetSupabaseAccessToken.mockResolvedValue("user-token");
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

    const result = await fetchAuditLog();

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

    await fetchAuditLog({ tableName: "users" });

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

    await fetchAuditLog({ actionType: "INSERT" });

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

    await fetchAuditLog({}, 100);

    expect(capturedUrl).toContain("offset=100");
  });

  it("throws when response is not ok", async () => {
    server.use(
      http.get(
        `${SUPABASE_URL}/rest/v1/logged_actions_with_user`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await expect(fetchAuditLog()).rejects.toThrow(
      "Audit REST query failed: 500",
    );
  });

  it("throws Unauthenticated when there is no Clerk session token", async () => {
    mockGetSupabaseAccessToken.mockResolvedValue(null);

    await expect(fetchAuditLog()).rejects.toThrow("Unauthenticated");
  });
});

describe("fetchAuditTableNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockGetSupabaseAccessToken.mockResolvedValue("token");
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

    const result = await fetchAuditTableNames();

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

    await fetchAuditTableNames();

    expect(capturedUrl).toContain("select=table_name");
  });
});

describe("fetchAuditLog — branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockGetSupabaseAccessToken.mockResolvedValue("token");
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

    await fetchAuditLog({ tableName: "---" });

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

    await fetchAuditLog({ actionType: "INVALID_ACTION" });

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

  // insertAuditLog still takes a Supabase client — it needs it to resolve
  // the caller's local user_profiles.id via getCurrentUserId (mocked above),
  // separately from the Clerk bearer token used for the raw fetch() itself.
  const fakeSupabase = {} as Parameters<
    typeof import("@/features/audit/infrastructure/auditQueries").insertAuditLog
  >[0];

  it("POSTs to logged_actions and resolves on success", async () => {
    mockGetSupabaseAccessToken.mockResolvedValue("my-token");
    mockGetCurrentUserId.mockResolvedValue("user-123");

    let capturedRequest: Request | null = null;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/logged_actions`, ({ request }) => {
        capturedRequest = request;
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const { insertAuditLog } =
      await import("@/features/audit/infrastructure/auditQueries");
    await insertAuditLog(fakeSupabase, "INSERT", "products", { id: "1" });

    expect(capturedRequest).not.toBeNull();
    const body = await (capturedRequest as unknown as Request).json();
    expect(body.action_type).toBe("INSERT");
    expect(body.table_name).toBe("products");
    expect(body.row_data).toEqual({ id: "1" });
    expect(body.user_id).toBe("user-123");
  });

  it("throws Unauthenticated when there is no Clerk session token", async () => {
    mockGetSupabaseAccessToken.mockResolvedValue(null);

    const { insertAuditLog } =
      await import("@/features/audit/infrastructure/auditQueries");
    await expect(
      insertAuditLog(fakeSupabase, "INSERT", "products"),
    ).rejects.toThrow("Unauthenticated");
  });

  it("throws when the POST response is not ok", async () => {
    mockGetSupabaseAccessToken.mockResolvedValue("my-token");
    mockGetCurrentUserId.mockResolvedValue("user-123");

    server.use(
      http.post(
        `${SUPABASE_URL}/rest/v1/logged_actions`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { insertAuditLog } =
      await import("@/features/audit/infrastructure/auditQueries");
    await expect(
      insertAuditLog(fakeSupabase, "INSERT", "products"),
    ).rejects.toThrow("Audit insert failed: 500");
  });
});
