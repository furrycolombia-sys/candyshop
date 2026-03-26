import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchActiveTemplates } from "@/features/products/infrastructure/templateQueries";

const TEMPLATES_QUERY_KEY = "product-templates";

export function useProductTemplates() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchActiveTemplates(supabase),
  });
}
