import { useQuery } from "@tanstack/react-query";

import { USER_PERMISSIONS_QUERY_KEY } from "@/features/users/domain/constants";

export function useUserPermissions(userId: string | null) {
  return useQuery({
    queryKey: [USER_PERMISSIONS_QUERY_KEY, userId],
    queryFn: async () => {
      const basePath =
        globalThis.window !== undefined &&
        globalThis.window.location.pathname.startsWith("/admin")
          ? "/admin"
          : "";

      const response = await fetch(
        `${basePath}/api/admin/users/${userId}/permissions`,
        { credentials: "same-origin" },
      );

      if (!response.ok) {
        throw new Error("Failed to load user permissions");
      }

      const data = (await response.json()) as { grantedKeys: string[] };
      return data.grantedKeys;
    },
    enabled: !!userId,
  });
}
