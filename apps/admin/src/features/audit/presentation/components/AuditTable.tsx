"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { AuditRowDetail } from "./AuditRowDetail";

import type { AuditEntry } from "@/features/audit/domain/types";
import { appUrls } from "@/shared/infrastructure/config";

/** Max fields to show before collapsing into "+N more" */
const MAX_VISIBLE_FIELDS = 3;

/** Number of characters to show for UUID previews */
const UUID_PREVIEW_LENGTH = 8;

/** Prefixes for summarizing INSERT / DELETE actions */
const SUMMARY_PREFIX_NEW = "New:";
const SUMMARY_PREFIX_DELETED = "Deleted:";

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-mint/20 text-mint border-mint",
  UPDATE: "bg-sky/20 text-sky border-sky",
  DELETE: "bg-peach/20 text-peach border-peach",
};

/**
 * Grid template for the audit log columns.
 * timestamp | user | table | action | summary | chevron
 */
const GRID_COLS = "grid-cols-[160px_100px_1fr_90px_1fr_40px]";

interface AuditTableProps {
  entries: AuditEntry[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

/** Summarize what changed in an entry */
function summarize(entry: AuditEntry): string {
  if (entry.action_type === "UPDATE" && entry.changed_fields) {
    const keys = Object.keys(entry.changed_fields);
    if (keys.length <= MAX_VISIBLE_FIELDS) return keys.join(", ");
    return `${keys.slice(0, MAX_VISIBLE_FIELDS).join(", ")} +${String(keys.length - MAX_VISIBLE_FIELDS)} more`;
  }
  if (entry.action_type === "INSERT" && entry.row_data) {
    const name =
      (entry.row_data as Record<string, unknown>).name_en ??
      (entry.row_data as Record<string, unknown>).name ??
      (entry.row_data as Record<string, unknown>).slug;
    if (name) return `${SUMMARY_PREFIX_NEW} ${String(name)}`;
  }
  if (entry.action_type === "DELETE" && entry.row_data) {
    const name =
      (entry.row_data as Record<string, unknown>).name_en ??
      (entry.row_data as Record<string, unknown>).name;
    if (name) return `${SUMMARY_PREFIX_DELETED} ${String(name)}`;
  }
  return "—";
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditTable({
  entries,
  isLoading,
  hasMore,
  onLoadMore,
}: AuditTableProps) {
  const t = useTranslations("audit.table");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t("timestamp")}...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed border-border bg-muted/30 py-16"
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
        className="overflow-x-auto border-3 border-foreground bg-background nb-shadow-md"
        {...tid("audit-table")}
      >
        {/* Header row */}
        <div
          className={`grid ${GRID_COLS} border-b-3 border-foreground bg-muted/50`}
        >
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
            const colorClass = ACTION_COLORS[entry.action_type] ?? "";

            return (
              <div
                key={entry.event_id}
                {...tid(`audit-row-${String(entry.event_id)}`)}
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.event_id)
                  }
                  className={`grid w-full ${GRID_COLS} items-center text-left transition-colors hover:bg-muted/30`}
                >
                  {/* Timestamp */}
                  <span className="truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {formatTimestamp(entry.action_timestamp)}
                  </span>

                  {/* User */}
                  <span className="truncate px-4 py-2.5 font-mono text-xs">
                    {entry.user_id ? (
                      <a
                        href={`${appUrls.auth}/en/profile/${entry.user_id}`}
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
                      className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${colorClass}`}
                    >
                      {entry.action_type}
                    </span>
                  </span>

                  {/* Summary */}
                  <span className="truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {summarize(entry)}
                  </span>

                  {/* Chevron */}
                  <span className="flex items-center justify-center px-2 py-2.5">
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

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
          onClick={onLoadMore}
          disabled={isLoading}
          className="nb-btn nb-btn-press-sm mx-auto border-3 border-foreground px-6 py-2 font-display text-xs font-bold uppercase tracking-widest"
          {...tid("audit-load-more")}
        >
          {t("loadMore")}
        </button>
      )}
    </div>
  );
}
