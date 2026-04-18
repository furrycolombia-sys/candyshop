"use client";

import { Activity, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

import { useRecentActivity } from "@/features/dashboard/application/hooks/useRecentActivity";
import { ActivityRow } from "@/features/dashboard/presentation/components/ActivityRow";
import { StatusRow } from "@/features/dashboard/presentation/components/StatusRow";
import { Link } from "@/shared/infrastructure/i18n";

const SYSTEM_STATUS_KEYS = ["database", "auth", "storage", "realtime"] as const;
const NO_ACTIVITY_CLASS =
  "px-5 py-6 text-center font-mono text-xs text-muted-foreground";
const NO_ACTIVITY_TEXT_KEY = "activity.noActivity";

interface DashboardPageContentProps {
  canViewAudit: boolean;
}

export function DashboardPageContent({
  canViewAudit,
}: DashboardPageContentProps) {
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("sidebar");
  const locale = useLocale();
  const { data: recentEntries } = useRecentActivity();

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("admin-page")}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("admin-title")}
          >
            {t("overview")}
          </h1>
          <p className="font-mono text-sm text-muted-foreground/70">
            {t("welcome")}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="border-strong border-foreground bg-background shadow-brutal-sm">
              <div className="border-b-strong border-foreground px-5 py-4">
                <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">
                  {t("recentActivity")}
                </h2>
              </div>
              <div className="divide-y divide-foreground/10">
                {!canViewAudit && (
                  <div className={NO_ACTIVITY_CLASS}>
                    {t(NO_ACTIVITY_TEXT_KEY)}
                  </div>
                )}
                {canViewAudit &&
                  (recentEntries ?? []).map((entry) => (
                    <ActivityRow
                      key={entry.event_id}
                      action={entry.action_type}
                      table={entry.table_name}
                      time={new Date(entry.action_timestamp).toLocaleString(
                        locale,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                      user={
                        entry.user_display_name ??
                        entry.user_email ??
                        entry.db_user
                      }
                    />
                  ))}
                {canViewAudit && recentEntries?.length === 0 && (
                  <div className={NO_ACTIVITY_CLASS}>
                    {t(NO_ACTIVITY_TEXT_KEY)}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="border-strong border-foreground bg-background shadow-brutal-sm">
              <div className="border-b-strong border-foreground px-5 py-4">
                <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">
                  {t("quickActions")}
                </h2>
              </div>
              <div className="flex flex-col gap-3 p-5">
                {canViewAudit && (
                  <Link
                    href="/audit"
                    className="button-brutal button-press-sm rounded-md bg-foreground px-4 py-3 text-sm text-background shadow-brutal-sm"
                    {...tid("quick-action-audit")}
                  >
                    <Activity className="size-4" />
                    <span className="flex-1 font-display tracking-wider">
                      {t("viewAuditLog")}
                    </span>
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>

              <div className="border-t-2 border-foreground/10 p-5">
                <div className="flex flex-col gap-3">
                  <span className="text-section-label font-mono text-muted-foreground/60">
                    {tSidebar("system")}
                  </span>
                  <div className="flex flex-col gap-2">
                    {SYSTEM_STATUS_KEYS.map((key) => (
                      <StatusRow
                        key={key}
                        label={t(`systemStatus.${key}`)}
                        status="operational"
                        statusLabel={t("systemStatus.operational")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
