"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { UserDetailPageContent } from "@/features/users/presentation/pages/UserDetailPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

interface UserDetailPageProps {
  userId: string;
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
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

  return (
    <UserDetailPageContent
      userId={userId}
      canCreate={hasPermission("user_permissions.create")}
      canDelete={hasPermission("user_permissions.delete")}
    />
  );
}
