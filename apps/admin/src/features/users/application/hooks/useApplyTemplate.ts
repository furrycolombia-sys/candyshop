import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PERMISSIONS_QUERY_KEY } from "@/features/users/domain/constants";

interface ApplyTemplateParams {
  userId: string;
  permissionKeys: string[];
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, permissionKeys }: ApplyTemplateParams) => {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ permissionKeys }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply permission template");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [USER_PERMISSIONS_QUERY_KEY, variables.userId],
      });
    },
  });
}
