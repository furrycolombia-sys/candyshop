"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { AuditLogPageContent } from "@/features/audit/presentation/pages/AuditLogPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function AuditLogPage() {
  const { hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (!hasPermission("audit.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <AuditLogPageContent />;
}
