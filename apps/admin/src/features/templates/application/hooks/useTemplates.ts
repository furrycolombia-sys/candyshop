import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { TEMPLATES_QUERY_KEY } from "@/features/templates/domain/constants";
import { fetchTemplates } from "@/features/templates/infrastructure/templateQueries";

export function useTemplates() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchTemplates(supabase),
    staleTime: 30_000,
  });
}
