/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/auth/application/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: vi.fn(() => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock(
  "@/features/seller-admins/infrastructure/delegatedOrderQueries",
  () => ({
    fetchDelegatedOrders: vi.fn(),
  }),
);

import { useDelegatedOrders } from "./useDelegatedOrders";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { fetchDelegatedOrders } from "@/features/seller-admins/infrastructure/delegatedOrderQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useDelegatedOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns delegated orders on success", async () => {
    const mock = [
      {
        seller: {
          seller_id: "s1",
          seller_display_name: "Seller",
          permissions: ["orders.approve"],
        },
        orders: [{ id: "o1" }],
      },
    ];
    vi.mocked(fetchDelegatedOrders).mockResolvedValue(mock);

    const { result } = renderHook(() => useDelegatedOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
    expect(fetchDelegatedOrders).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
    );
  });

  it("does not fetch when user is null", () => {
    vi.mocked(useSupabaseAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useSupabaseAuth>);

    const { result } = renderHook(() => useDelegatedOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDelegatedOrders).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    vi.mocked(useSupabaseAuth).mockReturnValue({
      user: { id: "user-1" },
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useSupabaseAuth>);
    vi.mocked(fetchDelegatedOrders).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useDelegatedOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
