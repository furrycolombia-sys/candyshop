/* eslint-disable react/no-multi-comp, i18next/no-literal-string */
"use client";

import { useCurrentUserPermissions } from "auth/client";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

import { PermissionGroupCard } from "../components/PermissionGroupCard";
import { TemplateButtons } from "../components/TemplateButtons";
import { UserHeader } from "../components/UserHeader";

import { useApplyTemplate } from "@/features/users/application/hooks/useApplyTemplate";
import { useTogglePermission } from "@/features/users/application/hooks/useTogglePermission";
import { useUserPermissions } from "@/features/users/application/hooks/useUserPermissions";
import { useUserProfile } from "@/features/users/application/hooks/useUserProfile";
import { PERMISSION_GROUPS } from "@/features/users/domain/constants";
import { useRouter } from "@/shared/infrastructure/i18n";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

interface UserDetailPageProps {
  userId: string;
}

function UserDetailPageContent({
  userId,
  canCreate,
  canDelete,
}: UserDetailPageProps & {
  canCreate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("users");
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: grantedKeys = [], isLoading: permissionsLoading } =
    useUserPermissions(userId);
  const toggleMutation = useTogglePermission();
  const templateMutation = useApplyTemplate();

  const isPending =
    toggleMutation.isPending ||
    templateMutation.isPending ||
    (!canCreate && !canDelete);
  const isLoading = profileLoading || permissionsLoading;

  const handleToggle = (key: string, grant: boolean) => {
    if ((grant && !canCreate) || (!grant && !canDelete)) return;
    toggleMutation.mutate({ userId, permissionKey: key, grant });
  };

  const handleToggleTemplate = (templateKeys: string[], activate: boolean) => {
    if (!canCreate || !canDelete) return;
    if (activate) {
      // Add template keys to existing grants (union)
      const newKeys = [...new Set([...grantedKeys, ...templateKeys])];
      templateMutation.mutate({ userId, permissionKeys: newKeys });
    } else {
      // Remove only this template's unique keys (keep the rest)
      const keysToRemove = new Set(templateKeys);
      const newKeys = grantedKeys.filter((k) => !keysToRemove.has(k));
      templateMutation.mutate({ userId, permissionKeys: newKeys });
    }
  };

  const handleReset = () => {
    if (!canDelete) return;
    templateMutation.mutate({ userId, permissionKeys: [] });
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col bg-dots">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <div className="animate-pulse text-muted-foreground">
            {t("loading")}
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col bg-dots">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("user-detail-page")}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/users")}
          className="w-fit gap-1 rounded-none font-display text-xs font-bold uppercase tracking-wider"
          {...tid("back-to-users")}
        >
          <ArrowLeft className="size-4" />
          {t("detail.backToUsers")}
        </Button>

        {/* User header */}
        <UserHeader user={profile} grantedKeys={grantedKeys} />

        {/* Template buttons */}
        <TemplateButtons
          grantedKeys={grantedKeys}
          onToggleTemplate={handleToggleTemplate}
          onReset={handleReset}
          isPending={isPending}
          canManage={canCreate && canDelete}
        />

        {/* Permission groups */}
        {PERMISSION_GROUPS.map((group) => (
          <PermissionGroupCard
            key={group.key}
            groupKey={group.key}
            labelKey={group.labelKey}
            permissions={group.permissions}
            grantedKeys={grantedKeys}
            onToggle={handleToggle}
            isPending={isPending}
            canManage={canCreate || canDelete}
          />
        ))}
      </div>
    </main>
  );
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("user_permissions.read")) {
    return <AccessDeniedState />;
  }

  return (
    <UserDetailPageContent
      userId={userId}
      canCreate={hasPermission("user_permissions.create")}
      canDelete={hasPermission("user_permissions.delete")}
    />
  );
}
