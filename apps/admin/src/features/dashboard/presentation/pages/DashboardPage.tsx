"use client";

import { Activity, ArrowRight, Database, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { ActivityRow } from "@/features/dashboard/presentation/components/ActivityRow";
import { StatusRow } from "@/features/dashboard/presentation/components/StatusRow";
import { Link } from "@/shared/infrastructure/i18n";

const STAT_CARDS = [
  {
    key: "totalEvents" as const,
    value: "1,247",
    icon: Activity,
    color: "bg-pink/15 text-pink border-pink/30",
    iconColor: "text-pink",
  },
  {
    key: "tablesMonitored" as const,
    value: "8",
    icon: Database,
    color: "bg-mint/15 text-mint border-mint/30",
    iconColor: "text-mint",
  },
  {
    key: "activeUsers" as const,
    value: "3",
    icon: Users,
    color: "bg-lilac/15 text-lilac border-lilac/30",
    iconColor: "text-lilac",
  },
  {
    key: "uptime" as const,
    value: "99.9%",
    icon: Shield,
    color: "bg-sky/15 text-sky border-sky/30",
    iconColor: "text-sky",
  },
] as const;

const SYSTEM_STATUS_KEYS = ["database", "auth", "storage", "realtime"] as const;

export function DashboardPage() {
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("sidebar");

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("admin-page")}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        {/* Header */}
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

        {/* Stats Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, value, icon, color, iconColor }) => {
            const StatIcon = icon;
            return (
              <div
                key={key}
                className="flex flex-col gap-3 border-3 border-foreground bg-background p-5 nb-shadow-sm transition-transform hover:-translate-y-0.5"
                {...tid(`stat-${key}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {t(`stats.${key}`)}
                  </span>
                  <div
                    className={`flex size-8 items-center justify-center rounded-md border ${color}`}
                  >
                    <StatIcon className={`size-4 ${iconColor}`} />
                  </div>
                </div>
                <span className="font-display text-3xl font-extrabold tracking-tight">
                  {value}
                </span>
              </div>
            );
          })}
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Recent Activity — left 3 cols */}
          <section className="lg:col-span-3">
            <div className="border-3 border-foreground bg-background nb-shadow-sm">
              <div className="border-b-3 border-foreground px-5 py-4">
                <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">
                  {t("recentActivity")}
                </h2>
              </div>
              <div className="divide-y divide-foreground/10">
                <ActivityRow
                  action="INSERT"
                  table="products"
                  time="2 min ago"
                  user="operator-1"
                />
                <ActivityRow
                  action="UPDATE"
                  table="orders"
                  time="8 min ago"
                  user="operator-2"
                />
                <ActivityRow
                  action="DELETE"
                  table="coupons"
                  time="14 min ago"
                  user="operator-1"
                />
                <ActivityRow
                  action="INSERT"
                  table="categories"
                  time="31 min ago"
                  user="operator-3"
                />
                <ActivityRow
                  action="UPDATE"
                  table="products"
                  time="1h ago"
                  user="operator-2"
                />
              </div>
            </div>
          </section>

          {/* Quick Actions — right 2 cols */}
          <section className="lg:col-span-2">
            <div className="border-3 border-foreground bg-background nb-shadow-sm">
              <div className="border-b-3 border-foreground px-5 py-4">
                <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">
                  {t("quickActions")}
                </h2>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <Link
                  href="/audit"
                  className="nb-btn rounded-md bg-foreground px-4 py-3 text-sm text-background nb-shadow-sm nb-btn-press-sm"
                  {...tid("quick-action-audit")}
                >
                  <Activity className="size-4" />
                  <span className="flex-1 font-display tracking-wider">
                    {t("viewAuditLog")}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              {/* System status panel */}
              <div className="border-t-2 border-foreground/10 p-5">
                <div className="flex flex-col gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
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
