"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { UsersPageContent } from "@/features/users/presentation/pages/UsersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function UsersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) return null;
  if (!hasPermission("user_permissions.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <UsersPageContent />;
}
