"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { tid } from "shared";
import { Input } from "ui";

import { Pagination } from "./Pagination";
import { UserRowWithRole } from "./UserRowWithRole";

import { useUsers } from "@/features/users/application/hooks/useUsers";
import {
  USER_SEARCH_DEBOUNCE_MS,
  USER_TABLE_COLUMN_COUNT,
  USERS_PER_PAGE,
} from "@/features/users/domain/constants";
import { usersSearchParams } from "@/features/users/domain/searchParams";
import type { UserProfileSummary } from "@/features/users/domain/types";

interface UserTableProps {
  onSelectUser: (userId: string) => void;
}

function renderTableBody(
  isLoading: boolean,
  users: UserProfileSummary[],
  loadingLabel: string,
  emptyLabel: string,
  onSelectUser: (userId: string) => void,
) {
  if (isLoading) {
    return (
      <tr>
        <td
          colSpan={USER_TABLE_COLUMN_COUNT}
          className="px-4 py-8 text-center text-sm text-muted-foreground"
        >
          {loadingLabel}
        </td>
      </tr>
    );
  }

  if (users.length === 0) {
    return (
      <tr>
        <td
          colSpan={USER_TABLE_COLUMN_COUNT}
          className="px-4 py-8 text-center text-sm text-muted-foreground"
          {...tid("users-empty-state")}
        >
          {emptyLabel}
        </td>
      </tr>
    );
  }

  return users.map((user) => (
    <UserRowWithRole key={user.id} user={user} onClick={onSelectUser} />
  ));
}

export function UserTable({ onSelectUser }: UserTableProps) {
  const t = useTranslations("users");
  const [params, setParams] = useQueryStates(usersSearchParams);
  const [filterInput, setFilterInput] = useState(params.search);

  // Debounce search input
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
  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const from = total === 0 ? 0 : (params.page - 1) * USERS_PER_PAGE + 1;
  const to = Math.min(params.page * USERS_PER_PAGE, total);

  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage }, { history: "push" });
  };

  return (
    <div className="space-y-4" {...tid("users-table")}>
      {/* Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="rounded-none border-2 border-foreground pl-10"
          {...tid("users-search-input")}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-2 border-foreground">
        <table className="w-full text-left" {...tid("users-table-element")}>
          <thead>
            <tr className="border-b-2 border-foreground bg-muted/30">
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.avatar")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.email")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.displayName")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.role")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.lastSeen")}
              </th>
            </tr>
          </thead>
          <tbody>
            {renderTableBody(
              isLoading,
              users,
              t("loading"),
              t("noResults"),
              onSelectUser,
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={params.page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
