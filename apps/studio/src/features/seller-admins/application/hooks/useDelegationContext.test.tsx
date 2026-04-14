/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    auth: {},
    from: mockFrom,
  })),
}));

vi.mock("@/features/auth/application/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: vi.fn(() => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

import { useDelegationContext } from "./useDelegationContext";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mockSupabaseQuery(data: unknown[], error: unknown = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error }),
    }),
  });
}

describe("useDelegationContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns delegations and helper functions", async () => {
    mockSupabaseQuery([
      {
        seller_id: "s1",
        permissions: ["orders.approve"],
        seller_profile: { id: "s1", display_name: "Seller One" },
      },
      {
        seller_id: "s2",
        permissions: ["orders.request_proof"],
        seller_profile: { id: "s2", display_name: "Seller Two" },
      },
    ]);

    const { result } = renderHook(() => useDelegationContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.delegations).toHaveLength(2);
    expect(result.current.isDelegateFor("s1")).toBe(true);
    expect(result.current.isDelegateFor("unknown")).toBe(false);
    expect(result.current.canApprove("s1")).toBe(true);
    expect(result.current.canApprove("s2")).toBe(false);
    expect(result.current.canRequestProof("s2")).toBe(true);
    expect(result.current.canRequestProof("s1")).toBe(false);
  });

  it("returns empty state when user has no delegations", async () => {
    mockSupabaseQuery([]);

    const { result } = renderHook(() => useDelegationContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.delegations).toHaveLength(0);
    expect(result.current.isDelegateFor("any")).toBe(false);
    expect(result.current.canApprove("any")).toBe(false);
    expect(result.current.canRequestProof("any")).toBe(false);
  });

  it("does not fetch when user is null", () => {
    vi.mocked(useSupabaseAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useSupabaseAuth>);

    const { result } = renderHook(() => useDelegationContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.delegations).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
