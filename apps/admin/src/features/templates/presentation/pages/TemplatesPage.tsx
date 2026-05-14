"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { TemplatesPageContent } from "@/features/templates/presentation/pages/TemplatesPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function TemplatesPage() {
  const { hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (!hasPermission("templates.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return (
    <TemplatesPageContent
      canCreate={hasPermission("templates.create")}
      canUpdate={hasPermission("templates.update")}
      canDelete={hasPermission("templates.delete")}
    />
  );
}
