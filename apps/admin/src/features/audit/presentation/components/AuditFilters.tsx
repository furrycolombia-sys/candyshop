"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { useAuditTableNames } from "@/features/audit/application/useAuditLog";

const ACTION_TYPES = ["INSERT", "UPDATE", "DELETE"] as const;

const PILL_BASE =
  "rounded-lg border-3 border-foreground px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors";
const PILL_ACTIVE = "bg-foreground text-background";
const PILL_INACTIVE = "bg-background text-foreground hover:bg-muted";

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

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      {...tid("audit-filters")}
    >
      {/* Table filter */}
      <select
        value={tableName}
        onChange={(e) => onTableChange(e.target.value)}
        className="h-9 rounded-lg border-3 border-foreground bg-background px-3 font-display text-xs font-bold uppercase tracking-wider"
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
          onClick={() => onActionChange("")}
          className={`${PILL_BASE} ${actionType === "" ? PILL_ACTIVE : PILL_INACTIVE}`}
          {...tid("audit-filter-all")}
        >
          {t("allActions")}
        </button>
        {ACTION_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onActionChange(type)}
            className={`${PILL_BASE} ${actionType === type ? PILL_ACTIVE : PILL_INACTIVE}`}
            {...tid(`audit-filter-${type.toLowerCase()}`)}
          >
            {t(type.toLowerCase() as "insert" | "update" | "delete")}
          </button>
        ))}
      </div>
    </div>
  );
}
