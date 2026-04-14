/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/seller-admins/infrastructure/delegateQueries", () => ({
  fetchDelegateCountsByProduct: vi.fn(),
}));

import { useDelegateCountsByProduct } from "./useDelegateCountsByProduct";

import { fetchDelegateCountsByProduct } from "@/features/seller-admins/infrastructure/delegateQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useDelegateCountsByProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns delegate counts on success", async () => {
    const mock: Record<string, number> = { p1: 3, p2: 1 };
    vi.mocked(fetchDelegateCountsByProduct).mockResolvedValue(mock);

    const { result } = renderHook(() => useDelegateCountsByProduct("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
    expect(fetchDelegateCountsByProduct).toHaveBeenCalledWith(
      expect.anything(),
      "s1",
    );
  });

  it("does not fetch when sellerId is undefined", () => {
    const { result } = renderHook(() => useDelegateCountsByProduct(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDelegateCountsByProduct).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    vi.mocked(fetchDelegateCountsByProduct).mockRejectedValue(
      new Error("fail"),
    );

    const { result } = renderHook(() => useDelegateCountsByProduct("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
