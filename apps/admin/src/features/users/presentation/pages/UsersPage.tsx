"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { UserTable } from "@/features/users/presentation/components/UserTable";
import { useRouter } from "@/shared/infrastructure/i18n";

export function UsersPage() {
  const t = useTranslations("users");
  const router = useRouter();

  const handleSelectUser = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("users-page")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("users-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {/* User table */}
        <UserTable onSelectUser={handleSelectUser} />
      </div>
    </main>
  );
}
