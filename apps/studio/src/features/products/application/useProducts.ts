import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { ProductFilters } from "@/features/products/domain/types";
import { fetchProducts } from "@/features/products/infrastructure/productQueries";

const PRODUCTS_QUERY_KEY = "products";

export function useProducts(filters?: Partial<ProductFilters>) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PRODUCTS_QUERY_KEY, filters],
    queryFn: () => fetchProducts(supabase, filters),
  });
}
