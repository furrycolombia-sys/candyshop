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

vi.mock("@/shared/infrastructure/receiptActions", () => ({
  uploadOrderReceipt: vi.fn(),
}));

import { useResubmitEvidence } from "@/features/orders/application/hooks/useResubmitEvidence";

import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";
import { resubmitEvidence } from "@/features/orders/infrastructure/orderQueries";
import { uploadOrderReceipt } from "@/shared/infrastructure/receiptActions";

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

  it("uploads receipt and passes receiptUrl to resubmitEvidence", async () => {
    vi.mocked(uploadOrderReceipt).mockResolvedValue({
      ok: true,
      path: "orders/order-2/r.png",
    } as Awaited<ReturnType<typeof uploadOrderReceipt>>);
    vi.mocked(resubmitEvidence).mockResolvedValue();

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const { result } = renderHook(() => useResubmitEvidence(), {
      wrapper: createWrapper(queryClient),
    });

    const file = new File(["data"], "r.png", { type: "image/png" });
    await act(() =>
      result.current.mutateAsync({
        orderId: "order-2",
        transferNumber: "TX-2",
        receiptFile: file,
      }),
    );

    expect(uploadOrderReceipt).toHaveBeenCalledWith("order-2", file);
    expect(resubmitEvidence).toHaveBeenCalledWith(
      supabaseClient,
      "order-2",
      "TX-2",
      "orders/order-2/r.png",
    );
  });

  it("throws when receipt upload returns ok: false", async () => {
    vi.mocked(uploadOrderReceipt).mockResolvedValue({
      ok: false,
      code: "upload_failed",
    } as Awaited<ReturnType<typeof uploadOrderReceipt>>);

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const { result } = renderHook(() => useResubmitEvidence(), {
      wrapper: createWrapper(queryClient),
    });

    const file = new File(["data"], "r.png", { type: "image/png" });
    await expect(
      act(() =>
        result.current.mutateAsync({
          orderId: "order-3",
          transferNumber: "TX-3",
          receiptFile: file,
        }),
      ),
    ).rejects.toThrow("upload_failed");

    expect(resubmitEvidence).not.toHaveBeenCalled();
  });
});
