"use client";

import { useQuery } from "@tanstack/react-query";

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
  const { data, isLoading } = useQuery({
    queryKey: [AUDIT_QUERY_KEY, filters, offset],
    queryFn: () => fetchAuditLog(filters, offset),
  });

  return { data, isLoading };
}

export function useAuditTableNames() {
  return useQuery({
    queryKey: [TABLE_NAMES_KEY],
    queryFn: () => fetchAuditTableNames(),
  });
}
