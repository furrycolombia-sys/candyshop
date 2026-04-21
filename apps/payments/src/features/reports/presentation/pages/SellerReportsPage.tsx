"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { tid } from "shared";

import { useSellerReports } from "@/features/reports/application/hooks/useSellerReports";
import {
  buildExportFilename,
  downloadExcel,
  exportSellerOrdersToExcel,
} from "@/features/reports/application/utils/exportSellerOrdersToExcel";
import { SellerReportFiltersBar } from "@/features/reports/presentation/components/SellerReportFiltersBar";
import { SellerReportTable } from "@/features/reports/presentation/components/SellerReportTable";

export function SellerReportsPage() {
  const t = useTranslations("sellerReports");
  const [isExporting, setIsExporting] = useState(false);
  const { orders, total, isLoading, isError, filters, setFilters } =
    useSellerReports();

  const currencies = useMemo(
    () => [...new Set(orders.map((o) => o.currency).filter(Boolean))].sort(),
    [orders],
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const content = exportSellerOrdersToExcel(orders, filters);
      downloadExcel(content, buildExportFilename());
    } finally {
      setIsExporting(false);
    }
  }, [filters, isExporting, orders]);

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
        <div className="flex items-center justify-center py-16 text-sm text-destructive">
          {t("error")}
        </div>
      );
    }

    return (
      <>
        <p
          className="text-xs text-muted-foreground"
          {...tid("seller-reports-total-count")}
        >
          {t("totalOrders", { count: total })}
        </p>
        <SellerReportTable orders={orders} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6" {...tid("seller-reports-page")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={orders.length === 0 || isExporting}
          className="flex items-center gap-2 rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          {...tid("seller-reports-export-button")}
        >
          <Download className="size-4" />
          {isExporting ? t("exporting") : t("exportExcel")}
        </button>
      </div>

      <SellerReportFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        currencies={currencies}
      />

      {renderContent()}
    </div>
  );
}
