"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";

import { SettingsPageContent } from "@/features/settings/presentation/pages/SettingsPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

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
