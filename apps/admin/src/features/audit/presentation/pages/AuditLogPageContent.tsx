"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { tid } from "shared";

import { useAuditLog } from "@/features/audit/application/useAuditLog";
import { AUDIT_PAGE_SIZE } from "@/features/audit/domain/constants";
import { auditSearchParams } from "@/features/audit/domain/searchParams";
import { AuditFilters } from "@/features/audit/presentation/components/AuditFilters";
import { AuditTable } from "@/features/audit/presentation/components/AuditTable";

export function AuditLogPageContent() {
  const t = useTranslations("audit");
  const [params, setParams] = useQueryStates(auditSearchParams);

  const {
    data: entries,
    isLoading,
    isError,
  } = useAuditLog({
    filters: {
      tableName: params.table,
      actionType: params.action,
    },
    offset: params.offset,
  });

  const handleLoadMore = () => {
    setParams({ offset: params.offset + AUDIT_PAGE_SIZE }, { history: "push" });
  };

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("audit-log-page")}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("audit-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <AuditFilters
          tableName={params.table}
          actionType={params.action}
          onTableChange={(value) =>
            setParams({ table: value, action: params.action, offset: 0 })
          }
          onActionChange={(value) =>
            setParams({ table: params.table, action: value, offset: 0 })
          }
        />

        <AuditTable
          entries={entries ?? []}
          isLoading={isLoading}
          isError={isError}
          hasMore={(entries?.length ?? 0) >= AUDIT_PAGE_SIZE}
          onLoadMore={handleLoadMore}
        />
      </div>
    </main>
  );
}
