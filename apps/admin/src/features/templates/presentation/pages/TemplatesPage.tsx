"use client";

import { useCurrentUserPermissions } from "auth/client";

import { TemplatesPageContent } from "@/features/templates/presentation/pages/TemplatesPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function TemplatesPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("templates.read")) {
    return <AccessDeniedState />;
  }

  return (
    <TemplatesPageContent
      canCreate={hasPermission("templates.create")}
      canUpdate={hasPermission("templates.update")}
      canDelete={hasPermission("templates.delete")}
    />
  );
}
