"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { tid } from "shared";

import { useLogExport } from "@/features/audit/application/hooks/useAuditLog";
import { useUsers } from "@/features/users/application/hooks/useUsers";
import {
  exportUsersToCsv,
  downloadCsv,
} from "@/features/users/application/utils/exportCsv";
import { USER_SEARCH_DEBOUNCE_MS } from "@/features/users/domain/constants";
import { usersSearchParams } from "@/features/users/domain/searchParams";
import { UserTable } from "@/features/users/presentation/components/UserTable";
import { useRouter } from "@/shared/infrastructure/i18n";

export function UsersPageContent() {
  const t = useTranslations("users");
  const router = useRouter();
  const [params, setParams] = useQueryStates(usersSearchParams);
  const [filterInput, setFilterInput] = useState(params.search);
  const { grantedKeys } = useCurrentUserPermissions();
  const canExport = grantedKeys.includes("users.export");
  const { mutate: logExport } = useLogExport();

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Sync external URL changes back to local state (equality guard breaks debounce→URL→sync cycle)
  useEffect(() => {
    const urlValue = params.search ?? "";
    if (urlValue !== filterInput) {
      setFilterInput(urlValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        { search: filterInput || null, page: 1 },
        { history: "replace" },
      );
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterInput, setParams]);

  const { data, isLoading } = useUsers(params.search, params.page);
  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const handleSelectUser = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleExportCsv = () => {
    const selected = users.filter((u) => selectedUsers.has(u.id));
    if (selected.length === 0) return;

    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    const csvContent = exportUsersToCsv(selected);

    downloadCsv(csvContent, `users-export-${timestamp}.csv`);

    logExport({ table: "users", count: selected.length });
  };

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("users-page")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("users-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <UserTable
          users={users}
          total={total}
          isLoading={isLoading}
          page={params.page}
          onPageChange={(p) => setParams({ page: p }, { history: "push" })}
          onSelectUser={handleSelectUser}
          selectedUsers={selectedUsers}
          onSelectUsersChange={setSelectedUsers}
          filterInput={filterInput}
          onFilterInputChange={setFilterInput}
          roleFilter={params.roleFilter}
          onRoleFilterChange={(v) =>
            setParams({ roleFilter: v }, { history: "replace" })
          }
          itemFilter={params.itemFilter}
          onItemFilterChange={(v) =>
            setParams({ itemFilter: v }, { history: "replace" })
          }
          canExport={canExport}
          onExportCsv={handleExportCsv}
        />
      </div>
    </main>
  );
}
