import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETTINGS_QUERY_KEY } from "@/features/settings/domain/constants";
import { updatePaymentSetting } from "@/features/settings/infrastructure/settingsQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updatePaymentSetting(supabase, key, Number(value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
    },
  });
}
