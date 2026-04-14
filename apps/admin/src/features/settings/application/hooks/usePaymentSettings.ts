import { useQuery } from "@tanstack/react-query";

import { SETTINGS_QUERY_KEY } from "@/features/settings/domain/constants";
import { fetchPaymentSettings } from "@/features/settings/infrastructure/settingsQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function usePaymentSettings() {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [SETTINGS_QUERY_KEY],
    queryFn: () => fetchPaymentSettings(supabase),
    staleTime: 30_000,
  });
}
