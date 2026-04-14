import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PROFILE_QUERY_KEY } from "@/features/account/domain/constants";
import type { ProfileFormValues } from "@/features/account/domain/types";
import { updateProfile } from "@/features/account/infrastructure/profileQueries";

export function useUpdateProfile(userId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
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
