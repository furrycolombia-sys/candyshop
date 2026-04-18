/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/application/hooks/useSupabase", () => ({
  useSupabase: vi.fn(),
}));

vi.mock("@/shared/infrastructure/recentActivityQueries", () => ({
  fetchRecentActivity: vi.fn(),
}));

import { useRecentActivity } from "./useRecentActivity";

import { useSupabase } from "@/shared/application/hooks/useSupabase";
import { fetchRecentActivity } from "@/shared/infrastructure/recentActivityQueries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockSupabase = {} as ReturnType<typeof useSupabase>;

describe("useRecentActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSupabase).mockReturnValue(mockSupabase);
  });

  it("fetches and returns recent activity", async () => {
    const mockActivity = [
      {
        id: "1",
        action: "user.login",
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
    ];
    vi.mocked(fetchRecentActivity).mockResolvedValue(
      mockActivity as unknown as ReturnType<
        typeof fetchRecentActivity
      > extends Promise<infer T>
        ? T
        : never,
    );

    const { result } = renderHook(() => useRecentActivity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchRecentActivity).toHaveBeenCalledWith(mockSupabase);
    expect(result.current.data).toEqual(mockActivity);
  });

  it("sets error state when fetch throws", async () => {
    vi.mocked(fetchRecentActivity).mockRejectedValue(
      new Error("DB connection error"),
    );

    const { result } = renderHook(() => useRecentActivity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
