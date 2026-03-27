import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { SETTINGS_QUERY_KEY } from "@/features/settings/domain/constants";
import { fetchPaymentSettings } from "@/features/settings/infrastructure/settingsQueries";

export function usePaymentSettings() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [SETTINGS_QUERY_KEY],
    queryFn: () => fetchPaymentSettings(supabase),
    staleTime: 30_000,
  });
}
