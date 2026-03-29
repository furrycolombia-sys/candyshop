import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PERMISSIONS_QUERY_KEY } from "@/features/users/domain/constants";
import { applyTemplate } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

interface ApplyTemplateParams {
  userId: string;
  permissionKeys: string[];
  grantedBy: string;
}

export function useApplyTemplate() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionKeys,
      grantedBy,
    }: ApplyTemplateParams) => {
      await applyTemplate(supabase, userId, permissionKeys, grantedBy);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [USER_PERMISSIONS_QUERY_KEY, variables.userId],
      });
    },
  });
}
