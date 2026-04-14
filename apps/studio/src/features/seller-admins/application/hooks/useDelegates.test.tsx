/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/seller-admins/infrastructure/delegateQueries", () => ({
  fetchDelegates: vi.fn(),
}));

import { useDelegates } from "./useDelegates";

import { fetchDelegates } from "@/features/seller-admins/infrastructure/delegateQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useDelegates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns delegates on success", async () => {
    const mock = [
      {
        id: "d1",
        seller_id: "s1",
        admin_user_id: "a1",
        permissions: ["orders.approve"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        admin_profile: {
          id: "a1",
          email: "admin@test.com",
          display_name: "Admin",
          avatar_url: null,
        },
      },
    ];
    vi.mocked(fetchDelegates).mockResolvedValue(mock);

    const { result } = renderHook(() => useDelegates("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
    expect(fetchDelegates).toHaveBeenCalledWith(expect.anything(), "s1");
  });

  it("does not fetch when sellerId is undefined", () => {
    const { result } = renderHook(() => useDelegates(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDelegates).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    vi.mocked(fetchDelegates).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useDelegates("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
