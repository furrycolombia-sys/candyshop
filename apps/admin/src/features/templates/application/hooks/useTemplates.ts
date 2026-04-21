import { useQuery } from "@tanstack/react-query";

import {
  TEMPLATES_QUERY_KEY,
  TEMPLATES_STALE_TIME_MS,
} from "@/features/templates/domain/constants";
import { fetchTemplates } from "@/features/templates/infrastructure/templateQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useTemplates() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => fetchTemplates(supabase),
    staleTime: TEMPLATES_STALE_TIME_MS,
  });
}
