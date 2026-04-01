/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseClient = { auth: {} };

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => supabaseClient),
}));

vi.mock("@/features/orders/infrastructure/orderQueries", () => ({
  resubmitEvidence: vi.fn(),
}));

import { useResubmitEvidence } from "./useResubmitEvidence";

import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";
import { resubmitEvidence } from "@/features/orders/infrastructure/orderQueries";

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useResubmitEvidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits evidence and invalidates the orders query", async () => {
    vi.mocked(resubmitEvidence).mockResolvedValue();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useResubmitEvidence(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        orderId: "order-1",
        transferNumber: "TX-1",
        receiptFile: null,
      }),
    );

    expect(resubmitEvidence).toHaveBeenCalledWith(
      supabaseClient,
      "order-1",
      "TX-1",
      null,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [MY_ORDERS_QUERY_KEY],
    });
  });
});
