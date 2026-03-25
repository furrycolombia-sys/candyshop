"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchStoreProductById,
  fetchStoreProducts,
} from "@/features/products/infrastructure/productQueries";

export function useStoreProducts() {
  return useQuery({
    queryKey: ["store-products"],
    queryFn: fetchStoreProducts,
  });
}

export function useStoreProduct(id: string) {
  return useQuery({
    queryKey: ["store-product", id],
    queryFn: () => fetchStoreProductById(id),
  });
}
