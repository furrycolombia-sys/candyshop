import { useQuery, useMutation } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { AuditFilters } from "@/features/audit/domain/types";
import {
  fetchAuditLog,
  fetchAuditTableNames,
  insertAuditLog,
} from "@/features/audit/infrastructure/auditQueries";

const AUDIT_QUERY_KEY = "audit-log";
const TABLE_NAMES_KEY = "audit-table-names";

/** Keep data fresh for 30s so back-navigation shows cached results instantly */
const STALE_TIME_MS = 30_000;

interface UseAuditLogOptions {
  filters?: Partial<AuditFilters>;
  offset: number;
  enabled?: boolean;
}

export function useAuditLog({
  filters,
  offset,
  enabled = true,
}: UseAuditLogOptions) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const { data, isLoading, isError } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [AUDIT_QUERY_KEY, filters, offset],
    queryFn: () => fetchAuditLog(supabase, filters, offset),
    staleTime: STALE_TIME_MS,
    enabled,
  });

  return { data, isLoading, isError };
}

export function useAuditTableNames() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TABLE_NAMES_KEY],
    queryFn: () => fetchAuditTableNames(supabase),
    staleTime: STALE_TIME_MS,
  });
}

export function useLogExport() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  return useMutation({
    mutationFn: async (params: { table: string; count: number }) => {
      await insertAuditLog(supabase, "EXPORT", params.table, {
        exported_count: params.count,
      });
    },
  });
}
