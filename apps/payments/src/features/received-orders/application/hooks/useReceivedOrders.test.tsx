/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseClient = { auth: {} };

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => supabaseClient),
}));

vi.mock(
  "@/features/received-orders/infrastructure/receivedOrderQueries",
  () => ({
    fetchReceivedOrders: vi.fn(),
  }),
);

import { useReceivedOrders } from "./useReceivedOrders";

import { fetchReceivedOrders } from "@/features/received-orders/infrastructure/receivedOrderQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useReceivedOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads received orders for the active filter", async () => {
    const orders = [{ id: "order-1", status: "pending_verification" }];
    vi.mocked(fetchReceivedOrders).mockResolvedValue(orders as never);

    const { result } = renderHook(() => useReceivedOrders("pending"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(orders);
    expect(fetchReceivedOrders).toHaveBeenCalledWith(supabaseClient, "pending");
  });
});
