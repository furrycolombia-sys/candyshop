/* eslint-disable react/no-multi-comp, i18next/no-literal-string */
"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton } from "ui";

import { usePaymentSettings } from "@/features/settings/application/hooks/usePaymentSettings";
import { useUpdateSettings } from "@/features/settings/application/hooks/useUpdateSettings";
import type { PaymentSettings } from "@/features/settings/domain/types";
import { SETTING_KEYS } from "@/features/settings/domain/types";
import { TimeoutSettings } from "@/features/settings/presentation/components/TimeoutSettings";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

function SettingsPageContent({ canUpdate }: { canUpdate: boolean }) {
  const t = useTranslations("settings");
  const { data: settings, isLoading, isError } = usePaymentSettings();
  const updateMutation = useUpdateSettings();

  const handleSave = (updated: PaymentSettings) => {
    for (const key of SETTING_KEYS) {
      if (!settings || updated[key] !== settings[key]) {
        updateMutation.mutate({ key, value: String(updated[key]) });
      }
    }
  };

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("settings-page")}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("settings-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {/* Content */}
        {isLoading && (
          <div className="flex flex-col gap-4" {...tid("settings-loading")}>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {isError && (
          <div
            className="border-strong border-destructive bg-destructive/10 p-4 font-display text-sm font-bold uppercase tracking-wider text-destructive"
            {...tid("settings-error")}
          >
            {t("error")}
          </div>
        )}

        {settings && (
          <TimeoutSettings
            settings={settings}
            onSave={canUpdate ? handleSave : () => {}}
            isPending={canUpdate ? updateMutation.isPending : false}
            canUpdate={canUpdate}
          />
        )}
      </div>
    </main>
  );
}

export function SettingsPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("payment_settings.read")) {
    return <AccessDeniedState />;
  }

  return (
    <SettingsPageContent canUpdate={hasPermission("payment_settings.update")} />
  );
}
