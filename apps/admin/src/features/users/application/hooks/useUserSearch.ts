import { useQuery } from "@tanstack/react-query";

import {
  MIN_USER_SEARCH_LENGTH,
  USER_SEARCH_QUERY_KEY,
} from "@/features/users/domain/constants";
import { searchUsers } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserSearch(query: string) {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable
    queryKey: [USER_SEARCH_QUERY_KEY, query],
    queryFn: () => searchUsers(supabase, query),
    enabled: query.length >= MIN_USER_SEARCH_LENGTH,
  });
}
