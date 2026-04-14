/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/seller-admins/infrastructure/delegateMutations", () => ({
  addDelegate: vi.fn(),
  updateDelegatePermissions: vi.fn(),
  removeDelegate: vi.fn(),
}));

import {
  useAddDelegate,
  useUpdateDelegatePermissions,
  useRemoveDelegate,
} from "./useDelegateMutations";

import {
  addDelegate,
  updateDelegatePermissions,
  removeDelegate,
} from "@/features/seller-admins/infrastructure/delegateMutations";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAddDelegate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls addDelegate on mutate", async () => {
    vi.mocked(addDelegate).mockResolvedValue({
      id: "d1",
      seller_id: "s1",
      admin_user_id: "a1",
      permissions: ["orders.approve"],
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    const { result } = renderHook(() => useAddDelegate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        sellerId: "s1",
        adminUserId: "a1",
        permissions: ["orders.approve"],
      }),
    );

    expect(addDelegate).toHaveBeenCalledWith(expect.anything(), "s1", "a1", [
      "orders.approve",
    ]);
  });
});

describe("useUpdateDelegatePermissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateDelegatePermissions on mutate", async () => {
    vi.mocked(updateDelegatePermissions).mockResolvedValue();

    const { result } = renderHook(() => useUpdateDelegatePermissions(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        sellerId: "s1",
        adminUserId: "a1",
        permissions: ["orders.approve", "orders.request_proof"],
      }),
    );

    expect(updateDelegatePermissions).toHaveBeenCalledWith(
      expect.anything(),
      "s1",
      "a1",
      ["orders.approve", "orders.request_proof"],
    );
  });
});

describe("useRemoveDelegate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls removeDelegate on mutate", async () => {
    vi.mocked(removeDelegate).mockResolvedValue();

    const { result } = renderHook(() => useRemoveDelegate(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        sellerId: "s1",
        adminUserId: "a1",
      }),
    );

    expect(removeDelegate).toHaveBeenCalledWith(expect.anything(), "s1", "a1");
  });
});
