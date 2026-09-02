/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseClient = { auth: {} };

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => supabaseClient),
}));

vi.mock(
  "@/features/received-orders/infrastructure/receivedOrderQueries",
  () => ({
    updateOrderStatus: vi.fn(),
  }),
);

import { useOrderActions } from "./useOrderActions";

import { RECEIVED_ORDERS_QUERY_KEY } from "@/features/received-orders/domain/constants";
import { updateOrderStatus } from "@/features/received-orders/infrastructure/receivedOrderQueries";

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useOrderActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the order and invalidates the received orders query", async () => {
    vi.mocked(updateOrderStatus).mockResolvedValue();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useOrderActions(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        orderId: "order-1",
        action: "approved",
        sellerNote: "looks good",
      }),
    );

    expect(updateOrderStatus).toHaveBeenCalledWith(
      supabaseClient,
      "order-1",
      "approved",
      "looks good",
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [RECEIVED_ORDERS_QUERY_KEY],
    });
  });
});
