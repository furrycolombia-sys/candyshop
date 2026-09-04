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

import { server } from "@/mocks/server";

/**
 * Moved with insertAuditLog itself, which is now shared rather than part of
 * the audit feature -- writing an entry is something any feature does.
 * Kept verbatim so the move cannot quietly lose a case.
 */
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
    typeof import("@/shared/infrastructure/auditLog").insertAuditLog
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

    const { insertAuditLog } = await import("@/shared/infrastructure/auditLog");
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

    const { insertAuditLog } = await import("@/shared/infrastructure/auditLog");
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

    const { insertAuditLog } = await import("@/shared/infrastructure/auditLog");
    await expect(
      insertAuditLog(fakeSupabase, "INSERT", "products"),
    ).rejects.toThrow("Audit insert failed: 500");
  });
});
