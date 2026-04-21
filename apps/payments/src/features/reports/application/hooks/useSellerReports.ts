"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";

import { SELLER_REPORTS_QUERY_KEY } from "@/features/reports/domain/constants";
import { sellerReportsSearchParams } from "@/features/reports/domain/searchParams";
import type { SellerReportFilters } from "@/features/reports/domain/types";
import { fetchSellerReportOrders } from "@/features/reports/infrastructure/reportsApi";

export function useSellerReports() {
  const [params, setParams] = useQueryStates(sellerReportsSearchParams);

  const filters: SellerReportFilters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status,
    buyerId: params.buyerId,
    currency: params.currency,
    amountMin: params.amountMin,
    amountMax: params.amountMax,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [SELLER_REPORTS_QUERY_KEY, filters],
    queryFn: () => fetchSellerReportOrders(filters),
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
