import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
// eslint-disable-next-line import/order -- vi.mock hoisting requires these imports before mocks are defined
import { useQueryStates } from "nuqs";
// eslint-disable-next-line import/order -- vi.mock hoisting requires these imports before mocks are defined
import { useQuery } from "@tanstack/react-query";

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return { ...actual, useQueryStates: vi.fn() };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("@/features/reports/infrastructure/reportsApi", () => ({
  fetchSellerReportOrders: vi.fn(),
}));

import { useSellerReports } from "./useSellerReports";

const mockSetParams = vi.fn();

const emptyParams = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

describe("useSellerReports", () => {
  beforeEach(() => {
    vi.mocked(useQueryStates).mockReturnValue([
      emptyParams,
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);
  });

  it("returns empty orders and zero total when no data", () => {
    const { result } = renderHook(() => useSellerReports());
    expect(result.current.orders).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("returns orders and total from query data", () => {
    const mockOrders = [{ id: "order-1" }];
    vi.mocked(useQuery).mockReturnValue({
      data: { orders: mockOrders, total: 1 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSellerReports());
    expect(result.current.orders).toEqual(mockOrders);
    expect(result.current.total).toBe(1);
  });

  it("returns isLoading from query", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSellerReports());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns isError from query", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSellerReports());
    expect(result.current.isError).toBe(true);
  });

  it("exposes filters built from query params", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { ...emptyParams, status: "approved" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);

    const { result } = renderHook(() => useSellerReports());
    expect(result.current.filters.status).toBe("approved");
  });

  it("exposes setFilters as setParams from nuqs", () => {
    const { result } = renderHook(() => useSellerReports());
    expect(result.current.setFilters).toBe(mockSetParams);
  });
});
