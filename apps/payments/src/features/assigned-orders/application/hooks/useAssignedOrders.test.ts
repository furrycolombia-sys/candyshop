/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("shared", () => ({
  useSupabase: vi.fn(() => ({})),
}));

vi.mock(
  "@/features/received-orders/infrastructure/receivedOrderQueries",
  () => ({
    fetchAssignedOrders: vi.fn(async () => []),
  }),
);

import { useAssignedOrders } from "./useAssignedOrders";

import { fetchAssignedOrders } from "@/features/received-orders/infrastructure/receivedOrderQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useAssignedOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isLoading true initially", () => {
    vi.mocked(fetchAssignedOrders).mockReturnValue(
      new Promise(() => {
        // never resolves — keep loading
      }),
    );

    const { result } = renderHook(() => useAssignedOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns data from fetchAssignedOrders once resolved", async () => {
    const mockOrders = [{ id: "order-1" }];
    vi.mocked(fetchAssignedOrders).mockResolvedValue(
      mockOrders as Awaited<ReturnType<typeof fetchAssignedOrders>>,
    );

    const { result } = renderHook(() => useAssignedOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockOrders);
  });

  it("calls fetchAssignedOrders with supabase client", async () => {
    vi.mocked(fetchAssignedOrders).mockResolvedValue([]);

    renderHook(() => useAssignedOrders(), { wrapper: createWrapper() });

    await waitFor(() => expect(fetchAssignedOrders).toHaveBeenCalledOnce());
  });
});
