import type { UserProfileSummary } from "@/features/users/domain/types";
import { getUserPermissionKeys } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserPermissionsBatch() {
  const supabase = useSupabase();

  const fetchPermissions = async (
    users: UserProfileSummary[],
  ): Promise<Record<string, string[]>> => {
    const entries = await Promise.all(
      users.map(async (user) => [
        user.id,
        await getUserPermissionKeys(supabase, user.id),
      ]),
    );
    return Object.fromEntries(entries);
  };

  return { fetchPermissions };
}
