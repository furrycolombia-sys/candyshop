"use client";

import { useCurrentUserPermissions } from "auth/client";

import { AuditLogPageContent } from "@/features/audit/presentation/pages/AuditLogPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function AuditLogPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("audit.read")) {
    return <AccessDeniedState />;
  }

  return <AuditLogPageContent />;
}
