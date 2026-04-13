import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PERMISSIONS_QUERY_KEY } from "@/features/users/domain/constants";
import { getApiBasePath } from "@/shared/application/utils/getApiBasePath";

interface ToggleParams {
  userId: string;
  permissionKey: string;
  grant: boolean;
}

export function useTogglePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, permissionKey, grant }: ToggleParams) => {
      const basePath = getApiBasePath();

      const response = await fetch(
        `${basePath}/api/admin/users/${userId}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ permissionKey, grant }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update permission");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [USER_PERMISSIONS_QUERY_KEY, variables.userId],
      });
    },
  });
}
