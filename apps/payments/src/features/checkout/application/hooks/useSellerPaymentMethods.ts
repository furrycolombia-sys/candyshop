"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchSellerPaymentMethods } from "@/features/checkout/infrastructure/checkoutQueries";

/**
 * Fetches payment methods configured by a specific seller.
 */
export function useSellerPaymentMethods(sellerId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    queryKey: ["seller-payment-methods", sellerId, supabase],
    queryFn: () => fetchSellerPaymentMethods(supabase, sellerId),
    enabled: !!sellerId,
  });
}
