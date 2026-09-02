/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/reports/infrastructure/reportsApi", () => ({
  fetchReportOrders: vi.fn(),
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: vi.fn(() => [
      {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      vi.fn(),
    ]),
  };
});

import { useReportOrders } from "./useReportOrders";

import type {
  ReportOrder,
  ReportOrdersResponse,
} from "@/features/reports/domain/types";
import { fetchReportOrders } from "@/features/reports/infrastructure/reportsApi";

const makeOrder = (): ReportOrder => ({
  id: "order-1",
  created_at: "2026-01-15T10:00:00Z",
  payment_status: "approved",
  total: 100,
  currency: "USD",
  transfer_number: null,
  receipt_url: null,
  buyer_id: "buyer-1",
  buyer_email: "buyer@example.com",
  buyer_display_name: "Buyer",
  seller_id: null,
  seller_email: null,
  seller_display_name: null,
  items: [],
});

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useReportOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns orders and total on success", async () => {
    const mockResponse: ReportOrdersResponse = {
      orders: [makeOrder()],
      total: 1,
    };
    vi.mocked(fetchReportOrders).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.isError).toBe(false);
  });

  it("returns empty arrays on initial load", () => {
    vi.mocked(fetchReportOrders).mockResolvedValue({ orders: [], total: 0 });

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("sets isError on fetch failure", async () => {
    vi.mocked(fetchReportOrders).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("exposes setFilters from useQueryStates", () => {
    vi.mocked(fetchReportOrders).mockResolvedValue({ orders: [], total: 0 });

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.setFilters).toBe("function");
  });

  it("exposes current filters object", async () => {
    vi.mocked(fetchReportOrders).mockResolvedValue({ orders: [], total: 0 });

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filters).toMatchObject({
      dateFrom: null,
      dateTo: null,
      status: null,
    });
  });

  it("calls fetchReportOrders with the current filters", async () => {
    vi.mocked(fetchReportOrders).mockResolvedValue({ orders: [], total: 0 });

    const { result } = renderHook(() => useReportOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchReportOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: null }),
    );
  });
});
