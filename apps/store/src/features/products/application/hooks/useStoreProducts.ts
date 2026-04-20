"use client";

import { useQuery } from "@tanstack/react-query";

import { STORE_PRODUCTS_QUERY_KEY } from "@/features/products/domain/constants";
import {
  fetchStoreProductById,
  fetchStoreProducts,
} from "@/features/products/infrastructure/productQueries";

export function useStoreProducts() {
  return useQuery({
    queryKey: [STORE_PRODUCTS_QUERY_KEY],
    queryFn: fetchStoreProducts,
    staleTime: 60_000,
  });
}

export function useStoreProduct(id: string) {
  return useQuery({
    queryKey: ["store-product", id],
    queryFn: () => fetchStoreProductById(id),
    staleTime: 60_000,
  });
}
