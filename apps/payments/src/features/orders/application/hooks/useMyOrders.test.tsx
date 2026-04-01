/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseClient = { auth: {} };

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => supabaseClient),
}));

vi.mock("@/features/orders/infrastructure/orderQueries", () => ({
  fetchMyOrders: vi.fn(),
}));

import { useMyOrders } from "./useMyOrders";

import { fetchMyOrders } from "@/features/orders/infrastructure/orderQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useMyOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns orders from the query layer", async () => {
    const orders = [
      {
        id: "order-1",
        buyer_id: "buyer-1",
        seller_id: "seller-1",
        status: "pending",
        total_cop: 120_000,
        created_at: "2026-03-31T00:00:00.000Z",
        updated_at: "2026-03-31T00:00:00.000Z",
        checkout_session_id: "session-1",
        transfer_number: null,
        receipt_url: null,
        seller_name: "Seller",
        items: [],
      },
    ];
    vi.mocked(fetchMyOrders).mockResolvedValue(orders as never);

    const { result } = renderHook(() => useMyOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(orders);
    expect(fetchMyOrders).toHaveBeenCalledWith(supabaseClient);
  });
});
