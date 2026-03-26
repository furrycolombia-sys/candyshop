"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { AuditFilters } from "@/features/audit/domain/types";
import {
  fetchAuditLog,
  fetchAuditTableNames,
} from "@/features/audit/infrastructure/auditQueries";

const AUDIT_QUERY_KEY = "audit-log";
const TABLE_NAMES_KEY = "audit-table-names";
const PAGE_SIZE = 50;

export function useAuditLog(filters?: Partial<AuditFilters>) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: [AUDIT_QUERY_KEY, filters, offset],
    queryFn: () => fetchAuditLog(filters, offset),
  });

  return {
    data,
    isLoading,
    offset,
    setOffset,
    pageSize: PAGE_SIZE,
    loadMore: () => setOffset((prev) => prev + PAGE_SIZE),
    resetOffset: () => setOffset(0),
  };
}

export function useAuditTableNames() {
  return useQuery({
    queryKey: [TABLE_NAMES_KEY],
    queryFn: () => fetchAuditTableNames(),
  });
}
