"use client";

import { useQuery } from "@tanstack/react-query";

import type { CartItem } from "@/features/checkout/domain/types";
import { fetchCheckoutPaymentMethods } from "@/features/checkout/infrastructure/checkoutPaymentMethods";

/**
 * Fetches payment methods configured by a specific seller.
 */
export function useSellerPaymentMethods(sellerId: string, items: CartItem[]) {
  return useQuery({
    queryKey: [
      "seller-payment-methods",
      sellerId,
      items.map((item) => `${item.id}:${item.quantity}`).join("|"),
    ],
    queryFn: () => fetchCheckoutPaymentMethods({ sellerId, items }),
    enabled: !!sellerId && items.length > 0,
    staleTime: 30_000,
  });
}
