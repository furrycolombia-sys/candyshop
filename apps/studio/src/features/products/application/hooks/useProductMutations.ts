import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { PRODUCTS_QUERY_KEY } from "@/features/products/domain/constants";
import type { ReorderItem } from "@/features/products/domain/types";
import {
  deleteProduct,
  reorderProducts,
  toggleProductField,
} from "@/features/products/infrastructure/productQueries";

export function useToggleProduct() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "is_active" | "featured";
      value: boolean;
    }) => toggleProductField(supabase, id, field, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}

export function useReorderProducts() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (items: ReorderItem[]) => reorderProducts(supabase, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}
