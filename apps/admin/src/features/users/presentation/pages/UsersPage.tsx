"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";

import { UsersPageContent } from "@/features/users/presentation/pages/UsersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function UsersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("user_permissions.read")) {
    return <AccessDeniedState />;
  }

  return <UsersPageContent />;
}
