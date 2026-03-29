"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { tid } from "shared";
import { Input } from "ui";

import { useUserSearch } from "@/features/users/application/hooks/useUserSearch";
import { MIN_USER_SEARCH_LENGTH } from "@/features/users/domain/constants";

const DEBOUNCE_MS = 300;

interface UserSearchProps {
  onSelectUser: (userId: string, email: string) => void;
}

export function UserSearch({ onSelectUser }: UserSearchProps) {
  const t = useTranslations("userPermissions");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: users } = useUserSearch(debouncedQuery);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10"
          {...tid("user-search-input")}
        />
      </div>

      {users && users.length > 0 && (
        <div className="space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelectUser(user.id, user.email)}
              className="flex w-full items-center gap-3 rounded-md border-2 border-foreground/10 px-3 py-2 text-left transition-colors hover:bg-muted/30"
              {...tid(`user-search-result-${user.id}`)}
            >
              <span className="text-sm font-medium">{user.email}</span>
              {user.display_name && (
                <span className="text-xs text-muted-foreground">
                  {user.display_name}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {users &&
        users.length === 0 &&
        debouncedQuery.length >= MIN_USER_SEARCH_LENGTH && (
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        )}
    </div>
  );
}
