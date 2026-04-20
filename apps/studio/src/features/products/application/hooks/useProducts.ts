import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PRODUCTS_QUERY_KEY } from "@/features/products/domain/constants";
import type { ProductFilters } from "@/features/products/domain/types";
import { fetchProducts } from "@/features/products/infrastructure/productQueries";

export function useProducts(filters?: Partial<ProductFilters>) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, filters],
    queryFn: () => fetchProducts(supabase, filters),
    staleTime: 60_000,
  });
}
