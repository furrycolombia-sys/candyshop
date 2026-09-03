import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useQueryStates } from "nuqs";

import { useQuery } from "@tanstack/react-query";

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return { ...actual, useQueryStates: vi.fn() };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return { ...actual, useSupabase: () => ({}) };
});

vi.mock("@/features/reports/infrastructure/delegatedReportsApi", () => ({
  fetchDelegatedReportOrders: vi.fn(),
}));

import { useDelegatedReports } from "@/features/reports/application/hooks/useDelegatedReports";

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

describe("useDelegatedReports", () => {
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
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.orders).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("returns orders and total from query data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { orders: [{ id: "o1" }], total: 1 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.total).toBe(1);
    expect(result.current.orders).toHaveLength(1);
  });

  it("exposes setFilters from nuqs", () => {
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.setFilters).toBe(mockSetParams);
  });
});
