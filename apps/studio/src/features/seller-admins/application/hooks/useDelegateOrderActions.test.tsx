/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
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
  "@/features/seller-admins/infrastructure/delegatedOrderActions",
  () => ({
    executeDelegateAction: vi.fn(),
  }),
);

import { useDelegateOrderActions } from "./useDelegateOrderActions";

import { executeDelegateAction } from "@/features/seller-admins/infrastructure/delegatedOrderActions";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useDelegateOrderActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls executeDelegateAction with approve action", async () => {
    vi.mocked(executeDelegateAction).mockResolvedValue();

    const { result } = renderHook(() => useDelegateOrderActions(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        orderId: "o1",
        action: "approve",
      }),
    );

    expect(executeDelegateAction).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      { orderId: "o1", action: "approve" },
    );
  });

  it("calls executeDelegateAction with request_proof action", async () => {
    vi.mocked(executeDelegateAction).mockResolvedValue();

    const { result } = renderHook(() => useDelegateOrderActions(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        orderId: "o1",
        action: "request_proof",
        seller_note: "Need clearer receipt",
      }),
    );

    expect(executeDelegateAction).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      {
        orderId: "o1",
        action: "request_proof",
        seller_note: "Need clearer receipt",
      },
    );
  });
});
