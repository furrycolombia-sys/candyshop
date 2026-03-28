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

vi.mock("@/features/checkout/infrastructure/receiptStorage", () => ({
  uploadReceipt: vi.fn(),
}));

import { useSubmitPayment } from "./useSubmitPayment";

import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";
import { uploadReceipt } from "@/features/checkout/infrastructure/receiptStorage";

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
  totalCop: 100_000,
  checkoutSessionId: "sess-1",
  transferNumber: null,
  receiptFile: null,
};

describe("useSubmitPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates order and submits receipt without file", async () => {
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
    );
    expect(uploadReceipt).not.toHaveBeenCalled();
  });

  it("uploads receipt when file is provided", async () => {
    vi.mocked(createOrder).mockResolvedValue("order-2");
    vi.mocked(uploadReceipt).mockResolvedValue("https://storage/receipt.jpg");
    vi.mocked(submitReceipt).mockResolvedValue();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() => useSubmitPayment(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        ...baseParams,
        receiptFile: file,
        transferNumber: "TXN-123",
      }),
    );

    expect(uploadReceipt).toHaveBeenCalledWith(
      expect.anything(),
      file,
      "order-2",
    );
    expect(submitReceipt).toHaveBeenCalledWith(
      expect.anything(),
      "order-2",
      "TXN-123",
      "https://storage/receipt.jpg",
    );
  });
});
