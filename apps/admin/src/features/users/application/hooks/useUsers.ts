import { useQuery } from "@tanstack/react-query";

import {
  USERS_PER_PAGE,
  USERS_QUERY_KEY,
} from "@/features/users/domain/constants";
import { listUsers } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUsers(search: string, page: number) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [USERS_QUERY_KEY, search, page],
    queryFn: () => listUsers(supabase, search, page, USERS_PER_PAGE),
    placeholderData: (previousData) => previousData,
  });
}
