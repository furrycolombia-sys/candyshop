/* eslint-disable i18next/no-literal-string */
"use client";

import { Download, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button, Input } from "ui";

import { Pagination } from "./Pagination";
import { UserRowWithRole } from "./UserRowWithRole";

import {
  USER_TABLE_COLUMN_COUNT,
  USERS_PER_PAGE,
} from "@/features/users/domain/constants";
import type { UserProfileSummary } from "@/features/users/domain/types";

interface UserTableProps {
  users: UserProfileSummary[];
  total: number;
  isLoading: boolean;
  page: number;
  onPageChange: (newPage: number) => void;
  onSelectUser: (userId: string) => void;
  selectedUsers: Set<string>;
  onSelectUsersChange: (users: Set<string>) => void;
  filterInput: string;
  onFilterInputChange: (input: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  itemFilter: string;
  onItemFilterChange: (item: string) => void;
  canExport: boolean;
  onExportExcel: () => void;
}

function renderTableBody(
  isLoading: boolean,
  users: UserProfileSummary[],
  loadingLabel: string,
  emptyLabel: string,
  onSelectUser: (userId: string) => void,
  selectedUsers: Set<string>,
  onSelectToggle: (userId: string, selected: boolean) => void,
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
    <UserRowWithRole
      key={user.id}
      user={user}
      onClick={onSelectUser}
      isSelected={selectedUsers.has(user.id)}
      onSelectToggle={onSelectToggle}
    />
  ));
}

export function UserTable({
  users,
  total,
  isLoading,
  page,
  onPageChange,
  onSelectUser,
  selectedUsers,
  onSelectUsersChange,
  filterInput,
  onFilterInputChange,
  roleFilter,
  onRoleFilterChange,
  itemFilter,
  onItemFilterChange,
  canExport,
  onExportExcel,
}: UserTableProps) {
  const t = useTranslations("users");

  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * USERS_PER_PAGE + 1;
  const to = Math.min(page * USERS_PER_PAGE, total);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectUsersChange(new Set(users.map((u) => u.id)));
    } else {
      onSelectUsersChange(new Set());
    }
  };

  const handleSelectToggle = (userId: string, checked: boolean) => {
    const next = new Set(selectedUsers);
    if (checked) next.add(userId);
    else next.delete(userId);
    onSelectUsersChange(next);
  };

  return (
    <div className="space-y-4" {...tid("users-table")}>
      {/* Top Bar with Filter and Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={filterInput}
              onChange={(e) => onFilterInputChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="rounded-none border-2 border-foreground pl-10"
              {...tid("users-search-input")}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-10 rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Roles</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
          <select
            value={itemFilter}
            onChange={(e) => onItemFilterChange(e.target.value)}
            className="h-10 rounded-none border-2 border-foreground bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Items</option>
            <option value="has_items">Has Items</option>
            <option value="no_items">No Items</option>
          </select>
        </div>
        {canExport && (
          <div>
            <Button
              onClick={onExportExcel}
              disabled={selectedUsers.size === 0}
              className="gap-2"
            >
              <Download className="size-4" />
              Export Selected to Excel
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-2 border-foreground bg-background">
        <table className="w-full text-left" {...tid("users-table-element")}>
          <thead>
            <tr className="border-b-2 border-foreground bg-muted/30">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    users.length > 0 && selectedUsers.size === users.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="size-4 rounded-sm border-2 border-foreground"
                />
              </th>
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
              selectedUsers,
              handleSelectToggle,
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
