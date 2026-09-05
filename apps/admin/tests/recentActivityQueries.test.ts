import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuditRestQuery = vi.fn();
vi.mock("@/shared/infrastructure/auditRestClient", () => ({
  auditRestQuery: (...args: unknown[]) => mockAuditRestQuery(...args),
}));

import { fetchRecentActivity } from "@/features/dashboard/infrastructure/recentActivityQueries";

describe("fetchRecentActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditRestQuery.mockResolvedValue([]);
  });

  it("calls auditRestQuery with the correct table name", async () => {
    await fetchRecentActivity();
    expect(mockAuditRestQuery).toHaveBeenCalledWith(
      "logged_actions_with_user",
      expect.any(URLSearchParams),
    );
  });

  it("passes select param with expected fields", async () => {
    await fetchRecentActivity();
    const params = mockAuditRestQuery.mock.calls[0]![1] as URLSearchParams;
    expect(params.get("select")).toContain("event_id");
    expect(params.get("select")).toContain("action_timestamp");
    expect(params.get("select")).toContain("user_email");
  });

  it("passes order param for descending timestamp", async () => {
    await fetchRecentActivity();
    const params = mockAuditRestQuery.mock.calls[0]![1] as URLSearchParams;
    expect(params.get("order")).toBe("action_timestamp.desc");
  });

  it("passes limit of 5", async () => {
    await fetchRecentActivity();
    const params = mockAuditRestQuery.mock.calls[0]![1] as URLSearchParams;
    expect(params.get("limit")).toBe("5");
  });

  it("returns the data from auditRestQuery", async () => {
    const mockData = [{ event_id: "e1", table_name: "orders" }];
    mockAuditRestQuery.mockResolvedValue(mockData);

    const result = await fetchRecentActivity();

    expect(result).toEqual(mockData);
  });
});
