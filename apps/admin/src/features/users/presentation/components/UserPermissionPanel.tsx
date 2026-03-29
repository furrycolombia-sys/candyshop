"use client";

import { useSupabaseAuth } from "auth/client";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { PermissionGroupCard } from "./PermissionGroupCard";
import { TemplateButtons } from "./TemplateButtons";

import { useApplyTemplate } from "@/features/users/application/hooks/useApplyTemplate";
import { useTogglePermission } from "@/features/users/application/hooks/useTogglePermission";
import { useUserPermissions } from "@/features/users/application/hooks/useUserPermissions";
import { PERMISSION_GROUPS } from "@/features/users/domain/constants";

interface UserPermissionPanelProps {
  userId: string;
  email: string;
}

export function UserPermissionPanel({
  userId,
  email,
}: UserPermissionPanelProps) {
  const t = useTranslations("userPermissions");
  const { user } = useSupabaseAuth();
  const { data: grantedKeys = [], isLoading } = useUserPermissions(userId);
  const toggleMutation = useTogglePermission();
  const templateMutation = useApplyTemplate();

  const isPending = toggleMutation.isPending || templateMutation.isPending;
  const grantedBy = user?.id;

  const handleToggle = (key: string, grant: boolean) => {
    if (!grantedBy) return;
    toggleMutation.mutate({ userId, permissionKey: key, grant, grantedBy });
  };

  const handleApplyTemplate = (keys: string[]) => {
    if (!grantedBy) return;
    templateMutation.mutate({ userId, permissionKeys: keys, grantedBy });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4" {...tid("user-permission-panel")}>
      {/* User header */}
      <div className="flex items-center justify-between border-b-2 border-foreground/10 pb-3">
        <span className="font-display text-sm font-extrabold uppercase tracking-wider">
          {email}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("permissionsCount", { count: grantedKeys.length })}
        </span>
      </div>

      {/* Template buttons */}
      <TemplateButtons
        onApply={handleApplyTemplate}
        isPending={isPending || !grantedBy}
      />

      {/* Permission groups */}
      {PERMISSION_GROUPS.map((group) => (
        <PermissionGroupCard
          key={group.key}
          groupKey={group.key}
          labelKey={group.labelKey}
          permissions={group.permissions}
          grantedKeys={grantedKeys}
          allGrantedKeys={grantedKeys}
          onToggle={handleToggle}
          isPending={isPending || !grantedBy}
        />
      ))}
    </div>
  );
}
