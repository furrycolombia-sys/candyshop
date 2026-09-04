"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useSupabase } from "shared";

import { sellerReportsSearchParams } from "@/features/reports/domain/searchParams";
import type { SellerReportFilters } from "@/features/reports/domain/types";
import { fetchDelegatedReportOrders } from "@/features/reports/infrastructure/delegatedReportsApi";
import { DELEGATED_REPORTS_QUERY_KEY } from "@/shared/domain/queryKeys";

const STALE_TIME_MS = 30_000;

export function useDelegatedReports() {
  const supabase = useSupabase();
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
    queryKey: [DELEGATED_REPORTS_QUERY_KEY, filters],
    queryFn: () => fetchDelegatedReportOrders(supabase, filters),
    staleTime: STALE_TIME_MS,
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
