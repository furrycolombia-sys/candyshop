/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/orders/infrastructure/pendingOrderCount", () => ({
  fetchPendingOrderCount: vi.fn(),
}));

import { usePendingOrderCount } from "./usePendingOrderCount";

import { fetchPendingOrderCount } from "@/features/orders/infrastructure/pendingOrderCount";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePendingOrderCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns count on success", async () => {
    vi.mocked(fetchPendingOrderCount).mockResolvedValue(5);

    const { result } = renderHook(() => usePendingOrderCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(5);
  });

  it("handles error", async () => {
    vi.mocked(fetchPendingOrderCount).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => usePendingOrderCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
