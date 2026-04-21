import { useQuery, useMutation } from "@tanstack/react-query";

import {
  AUDIT_QUERY_KEY,
  TABLE_NAMES_KEY,
} from "@/features/audit/domain/constants";
import type { AuditFilters } from "@/features/audit/domain/types";
import {
  fetchAuditLog,
  fetchAuditTableNames,
  insertAuditLog,
} from "@/features/audit/infrastructure/auditQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

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
  const supabase = useSupabase();

  const { data, isLoading, isError } = useQuery({
    queryKey: [AUDIT_QUERY_KEY, filters, offset],
    queryFn: () => fetchAuditLog(supabase, filters, offset),
    staleTime: STALE_TIME_MS,
    enabled,
  });

  return { data, isLoading, isError };
}

export function useAuditTableNames() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [TABLE_NAMES_KEY],
    queryFn: () => fetchAuditTableNames(supabase),
    staleTime: STALE_TIME_MS,
  });
}

export function useLogExport() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (params: { table: string; count: number }) => {
      await insertAuditLog(supabase, "EXPORT", params.table, {
        exported_count: params.count,
      });
    },
  });
}
