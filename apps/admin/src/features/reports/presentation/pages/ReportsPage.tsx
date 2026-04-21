"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { useReportOrders } from "@/features/reports/application/hooks/useReportOrders";
import {
  downloadExcel,
  exportOrdersToExcel,
} from "@/features/reports/application/utils/exportOrdersToExcel";
import type { ReportFilters } from "@/features/reports/domain/types";
import { ReportFiltersBar } from "@/features/reports/presentation/components/ReportFiltersBar";
import { ReportTable } from "@/features/reports/presentation/components/ReportTable";
import { tid } from "@/shared/infrastructure/config/tid";

export function ReportsPage() {
  const t = useTranslations("reports");
  const { orders, total, isLoading, isError, filters, setFilters } =
    useReportOrders();

  const [isExporting, setIsExporting] = useState(false);

  const currencies = useMemo(
    () => [...new Set(orders.map((o) => o.currency))].sort(),
    [orders],
  );

  const handleFiltersChange = useCallback(
    (updates: Partial<ReportFilters>) => {
      void setFilters(
        Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [k, v ?? null]),
        ) as Parameters<typeof setFilters>[0],
        { history: "replace" },
      );
    },
    [setFilters],
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    const isoDateLength = 10;
    try {
      const content = exportOrdersToExcel(orders);
      const date = new Date().toISOString().slice(0, isoDateLength);
      downloadExcel(content, `sales-report-${date}.xls`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, orders]);

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {t("loading")}
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 py-16 text-sm text-destructive">
          {t("error")}
        </div>
      );
    }
    return <ReportTable orders={orders} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6" {...tid("reports-page")}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || orders.length === 0}
          className="flex items-center gap-2 rounded-md border-2 border-foreground bg-foreground px-4 py-2 text-sm font-bold text-background transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          {...tid("reports-export-button")}
        >
          <Download className="size-4" />
          {isExporting ? t("exporting") : t("exportExcel")}
        </button>
      </div>

      {/* Filters */}
      <ReportFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        currencies={currencies}
      />

      {/* Results count */}
      {!isLoading && !isError && (
        <p
          className="text-sm text-muted-foreground"
          {...tid("reports-total-count")}
        >
          {t("totalOrders", { count: total })}
        </p>
      )}

      {/* Content */}
      {renderContent()}
    </div>
  );
}
