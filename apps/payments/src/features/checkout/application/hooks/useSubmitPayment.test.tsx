/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@/features/checkout/infrastructure/checkoutQueries", () => ({
  createOrder: vi.fn(),
  submitReceipt: vi.fn(),
}));

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  uploadReceipt: vi.fn(),
}));

import { useSubmitPayment } from "./useSubmitPayment";

import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
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

  it("creates order and submits receipt without buyer info", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-1");
    vi.mocked(submitReceipt).mockResolvedValue();

    const { result } = renderHook(() => useSubmitPayment(), {
      wrapper: createWrapper(),
    });

    const orderId = await act(() => result.current.mutateAsync(baseParams));

    expect(orderId).toBe("order-1");
    expect(createOrder).toHaveBeenCalled();
    expect(submitReceipt).toHaveBeenCalledWith(
      expect.anything(),
      "order-1",
      null,
      null,
      {},
    );
  });

  it("passes buyer info to submitReceipt", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-2");
    vi.mocked(submitReceipt).mockResolvedValue();

    const buyerInfo = { "field-1": "John Doe", "field-2": "john@example.com" };

    const { result } = renderHook(() => useSubmitPayment(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync({ ...baseParams, buyerInfo }));

    expect(submitReceipt).toHaveBeenCalledWith(
      expect.anything(),
      "order-2",
      null,
      null,
      buyerInfo,
    );
  });

  it("returns the order id on success", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-3");
    vi.mocked(submitReceipt).mockResolvedValue();

    const { result } = renderHook(() => useSubmitPayment(), {
      wrapper: createWrapper(),
    });

    const orderId = await act(() => result.current.mutateAsync(baseParams));
    expect(orderId).toBe("order-3");
  });
});
