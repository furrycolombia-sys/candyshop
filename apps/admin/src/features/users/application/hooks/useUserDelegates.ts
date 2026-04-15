import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBasePath } from "@/shared/application/utils/getApiBasePath";

export const USER_DELEGATES_QUERY_KEY = "user-delegates";

const SAME_ORIGIN = "same-origin" as const;

function delegatesUrl(basePath: string, userId: string) {
  return `${basePath}/api/admin/users/${userId}/delegates`;
}

interface ProfileShape {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ProductShape {
  id: string;
  name_en: string;
  name_es: string;
}

export interface DelegateAsSeller {
  id: string;
  seller_id: string;
  admin_user_id: string;
  product_id: string;
  permissions: string[];
  created_at: string;
  admin_profile: ProfileShape;
  product: ProductShape;
}

export interface DelegateAsDelegate {
  id: string;
  seller_id: string;
  admin_user_id: string;
  product_id: string;
  permissions: string[];
  created_at: string;
  seller_profile: ProfileShape;
  product: ProductShape;
}

interface UserDelegatesResponse {
  asSeller: DelegateAsSeller[];
  asDelegate: DelegateAsDelegate[];
}

export function useUserDelegates(userId: string | null) {
  return useQuery({
    queryKey: [USER_DELEGATES_QUERY_KEY, userId],
    queryFn: async (): Promise<UserDelegatesResponse> => {
      const basePath = getApiBasePath();
      const response = await fetch(delegatesUrl(basePath, userId as string), {
        credentials: SAME_ORIGIN,
      });
      if (!response.ok) throw new Error("Failed to load delegates");
      return response.json() as Promise<UserDelegatesResponse>;
    },
    enabled: !!userId,
  });
}

export function useRemoveUserDelegate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      delegateRowId,
    }: {
      userId: string;
      delegateRowId: string;
    }) => {
      const basePath = getApiBasePath();
      const response = await fetch(delegatesUrl(basePath, userId), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: SAME_ORIGIN,
        body: JSON.stringify({ delegateRowId }),
      });
      if (!response.ok) throw new Error("Failed to remove delegate");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [USER_DELEGATES_QUERY_KEY, variables.userId],
      });
    },
  });
}
