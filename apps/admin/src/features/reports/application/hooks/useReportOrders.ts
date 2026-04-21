"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";

import { REPORTS_QUERY_KEY } from "@/features/reports/domain/constants";
import { reportsSearchParams } from "@/features/reports/domain/searchParams";
import type { ReportFilters } from "@/features/reports/domain/types";
import { fetchReportOrders } from "@/features/reports/infrastructure/reportsApi";

export function useReportOrders() {
  const [params, setParams] = useQueryStates(reportsSearchParams);

  const filters: ReportFilters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status,
    sellerId: params.sellerId,
    buyerId: params.buyerId,
    productId: params.productId,
    currency: params.currency,
    amountMin: params.amountMin,
    amountMax: params.amountMax,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [REPORTS_QUERY_KEY, filters],
    queryFn: () => fetchReportOrders(filters),
    staleTime: 30_000,
  });

  return {
    orders: data?.orders ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    filters,
    setFilters: setParams,
  };
}
