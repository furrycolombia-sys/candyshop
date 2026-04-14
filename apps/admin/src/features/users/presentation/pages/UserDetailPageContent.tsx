"use client";

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
import {
  getUpdatedPermissionKeysForTemplateToggle,
  type TemplateKey,
} from "@/features/users/application/utils/templatePermissions";
import { PERMISSION_GROUPS } from "@/features/users/domain/constants";
import { useRouter } from "@/shared/infrastructure/i18n";

interface UserDetailPageContentProps {
  userId: string;
  canCreate: boolean;
  canDelete: boolean;
}

export function UserDetailPageContent({
  userId,
  canCreate,
  canDelete,
}: UserDetailPageContentProps) {
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

  const handleToggleTemplate = (
    templateKey: TemplateKey,
    activate: boolean,
  ) => {
    if (!canCreate || !canDelete) return;

    templateMutation.mutate({
      userId,
      permissionKeys: getUpdatedPermissionKeysForTemplateToggle(
        grantedKeys,
        templateKey,
        activate,
      ),
    });
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

        <UserHeader user={profile} grantedKeys={grantedKeys} />

        <TemplateButtons
          grantedKeys={grantedKeys}
          onToggleTemplate={handleToggleTemplate}
          onReset={handleReset}
          isPending={isPending}
          canManage={canCreate && canDelete}
        />

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
