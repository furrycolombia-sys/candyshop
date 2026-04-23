import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/checkout/infrastructure/checkoutQueries", () => ({
  createOrder: vi.fn(),
}));

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  uploadReceipt: vi.fn(),
}));

import { useSubmitPayment } from "./useSubmitPayment";

import { createOrder } from "@/features/checkout/infrastructure/checkoutQueries";
import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
    queryClient: qc,
  };
}

const baseParams = {
  userId: "u1",
  sellerId: "s1",
  paymentMethodId: "pm1",
  items: [],
  checkoutSessionId: "sess-1",
  buyerInfo: {},
  receiptFile: null,
  transferNumber: null,
};

describe("useSubmitPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates order with all params and returns its id", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-1");

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPayment(), { wrapper });

    const orderId = await act(() => result.current.mutateAsync(baseParams));

    expect(orderId).toBe("order-1");
    expect(createOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "u1",
        sellerId: "s1",
        paymentMethodId: "pm1",
        checkoutSessionId: "sess-1",
        transferNumber: null,
        receiptUrl: null,
        buyerInfo: {},
      }),
    );
  });

  it("passes buyer info to createOrder", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-2");

    const buyerInfo = { "field-1": "John Doe", "field-2": "john@example.com" };

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPayment(), { wrapper });

    await act(() => result.current.mutateAsync({ ...baseParams, buyerInfo }));

    expect(createOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ buyerInfo }),
    );
  });

  it("returns the order id on success", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-3");

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPayment(), { wrapper });

    const orderId = await act(() => result.current.mutateAsync(baseParams));
    expect(orderId).toBe("order-3");
  });

  it("invalidates my-orders query on success", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-4");

    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSubmitPayment(), { wrapper });

    await act(() => result.current.mutateAsync(baseParams));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [MY_ORDERS_QUERY_KEY],
    });
  });
});
