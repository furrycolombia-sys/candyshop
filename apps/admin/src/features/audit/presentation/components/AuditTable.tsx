"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { AuditRowDetail } from "./AuditRowDetail";

import type { AuditEntry } from "@/features/audit/domain/types";
import { appUrls } from "@/shared/infrastructure/config";

/** Max fields to show before collapsing into "+N more" */
const MAX_VISIBLE_FIELDS = 3;

/** Number of characters to show for UUID previews */
const UUID_PREVIEW_LENGTH = 8;

interface AuditTableProps {
  entries: AuditEntry[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

/** Extract a human-readable name from row_data */
function extractName(rowData: Record<string, unknown> | null): string | null {
  if (!rowData) return null;
  const name = rowData.name_en ?? rowData.name ?? rowData.slug;
  return name ? String(name) : null;
}

/** Valid i18n keys for summary messages */
type SummaryKey = "summaryMore" | "summaryNew" | "summaryDeleted";

/** Summarize what changed in an entry (returns key + params for i18n) */
function getSummary(entry: AuditEntry): {
  key: SummaryKey;
  values?: Record<string, string | number>;
} | null {
  if (entry.action_type === "UPDATE" && entry.changed_fields) {
    const keys = Object.keys(entry.changed_fields);
    if (keys.length <= MAX_VISIBLE_FIELDS) return null; // plain join, no i18n needed
    return {
      key: "summaryMore",
      values: {
        fields: keys.slice(0, MAX_VISIBLE_FIELDS).join(", "),
        count: keys.length - MAX_VISIBLE_FIELDS,
      },
    };
  }
  const name = extractName(entry.row_data);
  if (entry.action_type === "INSERT" && name) {
    return { key: "summaryNew", values: { name } };
  }
  if (entry.action_type === "DELETE" && name) {
    return { key: "summaryDeleted", values: { name } };
  }
  return null;
}

/** Plain text summary for UPDATE field lists */
function getUpdateFieldsSummary(entry: AuditEntry): string | null {
  if (entry.action_type === "UPDATE" && entry.changed_fields) {
    const keys = Object.keys(entry.changed_fields);
    if (keys.length <= MAX_VISIBLE_FIELDS) return keys.join(", ");
  }
  return null;
}

function formatTimestamp(ts: string, locale: string): string {
  const d = new Date(ts);
  return d.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionClass(actionType: AuditEntry["action_type"]): string {
  switch (actionType) {
    case "INSERT": {
      return "border-mint bg-mint/20 text-mint";
    }
    case "UPDATE": {
      return "border-sky bg-sky/20 text-sky";
    }
    case "DELETE": {
      return "border-peach bg-peach/20 text-peach";
    }
    default: {
      return "";
    }
  }
}

export function AuditTable({
  entries,
  isLoading,
  isError,
  hasMore,
  onLoadMore,
}: AuditTableProps) {
  const t = useTranslations("audit.table");
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-strong border-dashed border-destructive/30 bg-destructive/5 py-16"
        {...tid("audit-error")}
      >
        <p className="font-display text-lg font-bold uppercase text-destructive">
          {t("error")}
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-strong border-dashed border-border bg-muted/30 py-16"
        {...tid("audit-empty")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("noResults")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-x-auto border-strong border-foreground bg-background shadow-brutal-md"
        {...tid("audit-table")}
      >
        {/* Header row */}
        <div className="grid grid-cols-[160px_100px_1fr_90px_1fr_40px] border-b-strong border-foreground bg-muted/50">
          <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
            {t("timestamp")}
          </span>
          <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
            {t("user")}
          </span>
          <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
            {t("tableName")}
          </span>
          <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
            {t("action")}
          </span>
          <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
            {t("summary")}
          </span>
          <span />
        </div>

        {/* Data rows */}
        <div className="divide-y divide-foreground/8">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.event_id;
            const colorClass = getActionClass(entry.action_type);

            return (
              <div
                key={entry.event_id}
                {...tid(`audit-row-${String(entry.event_id)}`)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.event_id)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : entry.event_id);
                    }
                  }}
                  className="grid w-full grid-cols-[160px_100px_1fr_90px_1fr_40px] cursor-pointer items-center text-left transition-colors hover:bg-muted/30"
                >
                  {/* Timestamp */}
                  <span className="truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {formatTimestamp(entry.action_timestamp, locale)}
                  </span>

                  {/* User */}
                  <span className="truncate px-4 py-2.5 font-mono text-xs">
                    {entry.user_id ? (
                      <a
                        href={`${appUrls.auth}/${locale}/profile/${entry.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
                        title={entry.user_email ?? entry.user_id}
                      >
                        {entry.user_display_name ??
                          entry.user_id.slice(0, UUID_PREVIEW_LENGTH)}
                      </a>
                    ) : (
                      <span title={entry.db_user}>{entry.db_user}</span>
                    )}
                  </span>

                  {/* Table name */}
                  <span className="truncate px-4 py-2.5 font-mono text-xs font-bold">
                    {entry.table_name}
                  </span>

                  {/* Action badge */}
                  <span className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-ui-xs font-bold uppercase tracking-widest ${colorClass}`}
                    >
                      {entry.action_type}
                    </span>
                  </span>

                  {/* Summary */}
                  <span className="truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {(() => {
                      const plain = getUpdateFieldsSummary(entry);
                      if (plain) return plain;
                      const summary = getSummary(entry);
                      if (summary) return t(summary.key, summary.values);
                      return "—";
                    })()}
                  </span>

                  {/* Chevron */}
                  <span className="flex items-center justify-center px-2 py-2.5">
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && <AuditRowDetail entry={entry} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoading}
          className="button-brutal button-press-sm mx-auto border-strong border-foreground px-6 py-2 font-display text-xs font-bold uppercase tracking-widest"
          {...tid("audit-load-more")}
        >
          {t("loadMore")}
        </button>
      )}
    </div>
  );
}
