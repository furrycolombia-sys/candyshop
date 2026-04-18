import { useQuery } from "@tanstack/react-query";

import { USER_PROFILE_QUERY_KEY } from "@/features/users/domain/constants";
import { getUserProfile } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserProfile(userId: string | null) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [USER_PROFILE_QUERY_KEY, userId],
    queryFn: () => getUserProfile(supabase, userId as string),
    enabled: !!userId,
  });
}
