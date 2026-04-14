"use client";

import { matchesPermissions, useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { DashboardPageContent } from "@/features/dashboard/presentation/pages/DashboardPageContent";
import { ADMIN_APP_ACCESS_KEYS } from "@/shared/domain/constants";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function DashboardPage() {
  const { grantedKeys, isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) return null;
  if (!matchesPermissions(grantedKeys, [...ADMIN_APP_ACCESS_KEYS], "any")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <DashboardPageContent canViewAudit={hasPermission("audit.read")} />;
}
