"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { ORDER_STATUS_LIST } from "@/features/reports/domain/constants";
import type {
  OrderStatus,
  ReportFilters,
} from "@/features/reports/domain/types";

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onFiltersChange: (updates: Partial<ReportFilters>) => void;
  currencies: string[];
}

export function ReportFiltersBar({
  filters,
  onFiltersChange,
  currencies,
}: ReportFiltersBarProps) {
  const t = useTranslations("reports");

  const hasActiveFilters = Object.values(filters).some((v) => v != null);

  function handleClear() {
    onFiltersChange({
      dateFrom: null,
      dateTo: null,
      status: null,
      sellerId: null,
      buyerId: null,
      productId: null,
      currency: null,
      amountMin: null,
      amountMax: null,
    });
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-4"
      {...tid("reports-filters-bar")}
    >
      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("filters.dateFrom")}
        </label>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            onFiltersChange({ dateFrom: e.target.value || null })
          }
          className="h-8 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
          {...tid("reports-filter-date-from")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("filters.dateTo")}
        </label>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onFiltersChange({ dateTo: e.target.value || null })}
          className="h-8 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
          {...tid("reports-filter-date-to")}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("filters.status")}
        </label>
        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            onFiltersChange({
              status: (e.target.value as OrderStatus) || null,
            })
          }
          className="h-8 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
          {...tid("reports-filter-status")}
        >
          <option value="">{t("filters.allStatuses")}</option>
          {ORDER_STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Currency */}
      {currencies.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.currency")}
          </label>
          <select
            value={filters.currency ?? ""}
            onChange={(e) =>
              onFiltersChange({ currency: e.target.value || null })
            }
            className="h-8 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
            {...tid("reports-filter-currency")}
          >
            <option value="">{t("filters.allCurrencies")}</option>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amount range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("filters.amountMin")}
        </label>
        <input
          type="number"
          min={0}
          value={filters.amountMin ?? ""}
          onChange={(e) =>
            onFiltersChange({
              amountMin: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="h-8 w-28 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
          {...tid("reports-filter-amount-min")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("filters.amountMax")}
        </label>
        <input
          type="number"
          min={0}
          value={filters.amountMax ?? ""}
          onChange={(e) =>
            onFiltersChange({
              amountMax: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="h-8 w-28 rounded-sm border border-foreground/20 bg-background px-2 text-sm"
          {...tid("reports-filter-amount-max")}
        />
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-8 items-center gap-1.5 rounded-sm border border-foreground/20 bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          {...tid("reports-filter-clear")}
        >
          <X className="size-3.5" />
          {t("filters.clearFilters")}
        </button>
      )}
    </div>
  );
}
