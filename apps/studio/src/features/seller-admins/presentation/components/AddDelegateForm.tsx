"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { tid } from "shared";
import { Button, Input } from "ui";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { DELEGATE_PERMISSIONS } from "@/features/seller-admins/domain/constants";
import type { DelegatePermission } from "@/features/seller-admins/domain/types";
import { searchUsers } from "@/features/seller-admins/infrastructure/delegateQueries";

const MIN_SEARCH_LENGTH = 2;

interface AddDelegateFormProps {
  onAdd: (adminUserId: string, permissions: DelegatePermission[]) => void;
  isAdding?: boolean;
}

export function AddDelegateForm({ onAdd, isAdding }: AddDelegateFormProps) {
  const t = useTranslations("sellerAdmins");
  const { user } = useSupabaseAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    display_name: string | null;
  } | null>(null);
  const [permissions, setPermissions] = useState<Set<DelegatePermission>>(
    new Set(),
  );
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (!user || value.trim().length < MIN_SEARCH_LENGTH) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const users = await searchUsers(supabase, value, user.id);
        setResults(users);
      } finally {
        setIsSearching(false);
      }
    },
    [supabase, user],
  );

  const handleSelectUser = useCallback(
    (u: { id: string; email: string; display_name: string | null }) => {
      setSelectedUser(u);
      setQuery(u.display_name ?? u.email);
      setResults([]);
    },
    [],
  );

  const togglePermission = useCallback((perm: DelegatePermission) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedUser || permissions.size === 0) return;
    onAdd(selectedUser.id, [...permissions]);
    setSelectedUser(null);
    setQuery("");
    setPermissions(new Set());
  }, [selectedUser, permissions, onAdd]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          {...tid("delegate-search-input")}
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label={t("searchUsers")}
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelectUser(u)}
                >
                  <span className="font-medium">
                    {u.display_name ?? u.email}
                  </span>
                  {u.display_name && (
                    <span className="ml-2 text-muted-foreground">
                      {u.email}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {isSearching && (
          <p className="mt-1 text-xs text-muted-foreground">{t("searching")}</p>
        )}
      </div>

      {selectedUser && (
        <p className="text-sm">
          {t("selectedUser")}:{" "}
          <strong>{selectedUser.display_name ?? selectedUser.email}</strong>
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("permissionsLabel")}</legend>
        {DELEGATE_PERMISSIONS.map((perm) => (
          <label key={perm} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...tid(`delegate-permission-${perm}`)}
              checked={permissions.has(perm)}
              onChange={() => togglePermission(perm)}
            />
            {t(`permissions.${perm}`)}
          </label>
        ))}
      </fieldset>

      <Button
        {...tid("delegate-add-submit")}
        onClick={handleSubmit}
        disabled={!selectedUser || permissions.size === 0 || isAdding}
      >
        {isAdding ? t("adding") : t("addDelegate")}
      </Button>
    </div>
  );
}
