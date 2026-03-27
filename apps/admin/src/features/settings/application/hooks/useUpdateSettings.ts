import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { SETTINGS_QUERY_KEY } from "@/features/settings/domain/constants";
import { updatePaymentSetting } from "@/features/settings/infrastructure/settingsQueries";

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updatePaymentSetting(supabase, key, Number(value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
    },
  });
}
