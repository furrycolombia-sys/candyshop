"use client";

import { Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

import type { AuditEntry } from "@/features/audit/domain/types";
import { appUrls } from "@/shared/infrastructure/config";

interface AuditRowDetailProps {
  entry: AuditEntry;
}

const JSON_INDENT = 2;

/** Render a JSONB value as a formatted string */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object")
    return JSON.stringify(value, null, JSON_INDENT);
  return String(value);
}

export function AuditRowDetail({ entry }: AuditRowDetailProps) {
  const t = useTranslations("audit.detail");
  const locale = useLocale();

  const handleCopyUserId = async () => {
    if (entry.user_id) {
      try {
        await navigator.clipboard.writeText(entry.user_id);
      } catch {
        // Clipboard permission denied or non-HTTPS context — ignore silently
      }
    }
  };

  return (
    <div
      className="border-t-2 border-foreground/10 bg-muted/20 px-6 py-4"
      {...tid("audit-row-detail")}
    >
      {/* Metadata row */}
      <div className="mb-3 flex items-center gap-4 font-mono text-xs text-muted-foreground">
        {(entry.user_email ?? entry.user_id) && (
          <span className="flex items-center gap-2">
            {entry.user_avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.user_avatar}
                alt=""
                className="size-5 rounded-full border border-foreground/20"
              />
            )}
            <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              {t("user")}
            </span>
            <a
              href={`${appUrls.auth}/${locale}/profile/${entry.user_id}`}
              className="text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground/80"
            >
              {entry.user_display_name ?? entry.user_email ?? entry.user_id}
            </a>
            {entry.user_email && entry.user_display_name && (
              <span className="text-muted-foreground/60">
                ({entry.user_email})
              </span>
            )}
            {entry.user_id && (
              <button
                type="button"
                onClick={handleCopyUserId}
                className="transition-colors hover:text-foreground"
                aria-label={t("copyUserId")}
                {...tid("audit-copy-user-id")}
              >
                <Copy className="size-3" />
              </button>
            )}
          </span>
        )}
        <span>
          {t("transactionId")}: {entry.transaction_id}
        </span>
        {entry.client_ip && (
          <span>
            {t("ip")}: {entry.client_ip}
          </span>
        )}
      </div>

      {/* Changed fields (UPDATE only) */}
      {entry.action_type === "UPDATE" && entry.changed_fields && (
        <div className="mb-4">
          <h4 className="mb-2 font-display text-xs font-bold uppercase tracking-wider">
            {t("changedFields")}
          </h4>
          <div className="overflow-x-auto border-2 border-foreground/20">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-foreground/10 bg-muted/30">
                  <th className="px-3 py-2 text-left font-display font-bold uppercase tracking-wider">
                    {t("field")}
                  </th>
                  <th className="px-3 py-2 text-left font-display font-bold uppercase tracking-wider text-success">
                    {t("newValue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(entry.changed_fields).map(([key, newVal]) => {
                  return (
                    <tr key={key} className="border-b border-foreground/5">
                      <td className="px-3 py-2 font-mono font-bold">{key}</td>
                      <td className="px-3 py-2 font-mono">
                        {formatValue(newVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full record */}
      <details>
        <summary className="cursor-pointer font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
          {t("fullRecord")}
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto bg-foreground/5 p-3 font-mono text-xs">
          {JSON.stringify(entry.row_data, null, JSON_INDENT)}
        </pre>
      </details>
    </div>
  );
}
