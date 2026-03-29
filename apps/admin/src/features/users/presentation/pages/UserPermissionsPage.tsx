"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { UserPermissionPanel } from "@/features/users/presentation/components/UserPermissionPanel";
import { UserSearch } from "@/features/users/presentation/components/UserSearch";

interface SelectedUser {
  id: string;
  email: string;
}

export function UserPermissionsPage() {
  const t = useTranslations("userPermissions");
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
      {...tid("user-permissions-page")}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("user-permissions-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {/* Search */}
        <UserSearch
          onSelectUser={(id, email) => setSelectedUser({ id, email })}
        />

        {/* Permission panel or empty state */}
        {selectedUser ? (
          <UserPermissionPanel
            userId={selectedUser.id}
            email={selectedUser.email}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("selectUser")}</p>
        )}
      </div>
    </main>
  );
}
