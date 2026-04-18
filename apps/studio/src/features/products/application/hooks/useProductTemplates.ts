import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { TEMPLATES_QUERY_KEY } from "@/features/products/domain/constants";
import { fetchActiveTemplates } from "@/features/products/infrastructure/templateQueries";

export function useProductTemplates() {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchActiveTemplates(supabase),
  });
}
