import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { AuditFilters } from "@/features/audit/domain/types";
import {
  fetchAuditLog,
  fetchAuditTableNames,
} from "@/features/audit/infrastructure/auditQueries";

const AUDIT_QUERY_KEY = "audit-log";
const TABLE_NAMES_KEY = "audit-table-names";

interface UseAuditLogOptions {
  filters?: Partial<AuditFilters>;
  offset: number;
}

export function useAuditLog({ filters, offset }: UseAuditLogOptions) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const { data, isLoading, isError } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [AUDIT_QUERY_KEY, filters, offset],
    queryFn: () => fetchAuditLog(supabase, filters, offset),
  });

  return { data, isLoading, isError };
}

export function useAuditTableNames() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TABLE_NAMES_KEY],
    queryFn: () => fetchAuditTableNames(supabase),
  });
}
