import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { PROFILE_QUERY_KEY } from "@/features/account/domain/constants";
import type { ProfileFormValues } from "@/features/account/domain/types";
import { updateProfile } from "@/features/account/infrastructure/profileQueries";

export function useUpdateProfile(userId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile(supabase, userId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [PROFILE_QUERY_KEY, userId],
      });
    },
  });
}
