"use client";

import { matchesPermissions, useCurrentUserPermissions } from "auth/client";

import { DashboardPageContent } from "@/features/dashboard/presentation/pages/DashboardPageContent";
import { ADMIN_APP_ACCESS_KEYS } from "@/features/users/domain/constants";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function DashboardPage() {
  const { grantedKeys, isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!matchesPermissions(grantedKeys, [...ADMIN_APP_ACCESS_KEYS], "any")) {
    return <AccessDeniedState />;
  }

  return <DashboardPageContent canViewAudit={hasPermission("audit.read")} />;
}
