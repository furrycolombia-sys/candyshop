import { createBrowserSupabaseClient } from "api/supabase";
import { useCallback, useMemo } from "react";

import { searchUsers } from "@/features/seller-admins/infrastructure/delegateQueries";

export type UserSearchResult = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function useDelegateSearch(excludeUserId?: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const search = useCallback(
    (query: string): Promise<UserSearchResult[]> => {
      if (!excludeUserId) return Promise.resolve([]);
      return searchUsers(supabase, query, excludeUserId);
    },
    [supabase, excludeUserId],
  );

  return { search };
}
