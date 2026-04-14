"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import { useAuditTableNames } from "@/features/audit/application/useAuditLog";
import { AUDIT_ACTION_TYPES } from "@/features/audit/domain/constants";

interface AuditFiltersProps {
  tableName: string;
  actionType: string;
  onTableChange: (value: string) => void;
  onActionChange: (value: string) => void;
}

export function AuditFilters({
  tableName,
  actionType,
  onTableChange,
  onActionChange,
}: AuditFiltersProps) {
  const t = useTranslations("audit.filters");
  const { data: tableNames } = useAuditTableNames();

  const getActionButtonClass = (isActive: boolean) =>
    cn(
      "rounded-lg border-strong border-foreground px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors",
      isActive
        ? "bg-foreground text-background"
        : "bg-background text-foreground hover:bg-muted",
    );

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      {...tid("audit-filters")}
    >
      {/* Table filter */}
      <select
        value={tableName}
        onChange={(e) => onTableChange(e.target.value)}
        className="h-9 rounded-lg border-strong border-foreground bg-background px-3 font-display text-xs font-bold uppercase tracking-wider"
        {...tid("audit-filter-table")}
      >
        <option value="">{t("allTables")}</option>
        {(tableNames ?? []).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {/* Action type pills */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onActionChange("")}
          className={getActionButtonClass(actionType === "")}
          {...tid("audit-filter-all")}
        >
          {t("allActions")}
        </button>
        {AUDIT_ACTION_TYPES.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => onActionChange(type)}
            className={getActionButtonClass(actionType === type)}
            {...tid(`audit-filter-${type.toLowerCase()}`)}
          >
            {t(type.toLowerCase() as "insert" | "update" | "delete")}
          </button>
        ))}
      </div>
    </div>
  );
}
