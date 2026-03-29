import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PERMISSIONS_QUERY_KEY } from "@/features/users/domain/constants";
import {
  grantPermission,
  revokePermission,
} from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

interface ToggleParams {
  userId: string;
  permissionKey: string;
  grant: boolean;
  grantedBy: string;
}

export function useTogglePermission() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionKey,
      grant: shouldGrant,
      grantedBy,
    }: ToggleParams) => {
      await (shouldGrant
        ? grantPermission(supabase, userId, permissionKey, grantedBy)
        : revokePermission(supabase, userId, permissionKey));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [USER_PERMISSIONS_QUERY_KEY, variables.userId],
      });
    },
  });
}
