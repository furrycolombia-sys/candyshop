import type { UserProfileSummary } from "@/features/users/domain/types";
import { getUserPermissionKeys } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserPermissionsBatch() {
  const supabase = useSupabase();

  const fetchPermissions = async (
    users: UserProfileSummary[],
  ): Promise<Record<string, string[]>> => {
    const results = await Promise.allSettled(
      users.map((user) => getUserPermissionKeys(supabase, user.id)),
    );
    const entries = users.map((user, index) => {
      const result = results[index];
      return [
        user.id,
        result?.status === "fulfilled" ? result.value : [],
      ] as const;
    });
    return Object.fromEntries(entries);
  };

  return { fetchPermissions };
}
