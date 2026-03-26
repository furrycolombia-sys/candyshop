"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { tid } from "shared";

import { useAuditLog } from "@/features/audit/application/useAuditLog";
import { auditSearchParams } from "@/features/audit/domain/searchParams";
import { AuditFilters } from "@/features/audit/presentation/components/AuditFilters";
import { AuditTable } from "@/features/audit/presentation/components/AuditTable";

const PAGE_SIZE = 50;

export function AuditLogPage() {
  const t = useTranslations("audit");
  const [filters, setFilters] = useQueryStates(auditSearchParams);

  const {
    data: entries,
    isLoading,
    offset,
    loadMore,
    resetOffset,
  } = useAuditLog({
    tableName: filters.table,
    actionType: filters.action,
  });

  // Reset pagination when filters change
  useEffect(() => {
    resetOffset();
  }, [filters.table, filters.action, resetOffset]);

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("audit-log-page")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("audit-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {/* Filters */}
        <AuditFilters
          tableName={filters.table}
          actionType={filters.action}
          onTableChange={(value) =>
            setFilters({ table: value, action: filters.action })
          }
          onActionChange={(value) =>
            setFilters({ table: filters.table, action: value })
          }
        />

        {/* Table */}
        <AuditTable
          entries={entries ?? []}
          isLoading={isLoading}
          hasMore={(entries?.length ?? 0) >= offset + PAGE_SIZE}
          onLoadMore={loadMore}
        />
      </div>
    </main>
  );
}
