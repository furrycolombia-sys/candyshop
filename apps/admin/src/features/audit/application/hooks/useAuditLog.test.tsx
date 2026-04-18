/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/audit/infrastructure/auditQueries", () => ({
  fetchAuditLog: vi.fn(),
  fetchAuditTableNames: vi.fn(),
}));

import { useAuditLog, useAuditTableNames } from "./useAuditLog";

import {
  fetchAuditLog,
  fetchAuditTableNames,
} from "@/features/audit/infrastructure/auditQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAuditLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns data on success", async () => {
    const mock: import("@/features/audit/domain/types").AuditEntry[] = [
      {
        event_id: 1,
        schema_name: "public",
        table_name: "users",
        user_id: null,
        user_email: null,
        user_display_name: null,
        user_avatar: null,
        db_user: "postgres",
        action_type: "INSERT",
        row_data: null,
        changed_fields: null,
        action_timestamp: "2025-01-01T00:00:00Z",
        transaction_id: 1,
        client_ip: null,
      },
    ];
    vi.mocked(fetchAuditLog).mockResolvedValue(mock);

    const { result } = renderHook(() => useAuditLog({ offset: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
    expect(result.current.isError).toBe(false);
  });

  it("passes filters and offset to queryFn", async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue([]);

    const filters = { tableName: "users" };
    const { result } = renderHook(() => useAuditLog({ filters, offset: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchAuditLog).toHaveBeenCalledWith(expect.anything(), filters, 50);
  });

  it("sets isError on failure", async () => {
    vi.mocked(fetchAuditLog).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAuditLog({ offset: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAuditTableNames", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns table names on success", async () => {
    vi.mocked(fetchAuditTableNames).mockResolvedValue(["users", "orders"]);

    const { result } = renderHook(() => useAuditTableNames(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(["users", "orders"]);
  });

  it("handles error", async () => {
    vi.mocked(fetchAuditTableNames).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAuditTableNames(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
