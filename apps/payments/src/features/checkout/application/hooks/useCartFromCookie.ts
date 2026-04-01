"use client";

import { useLocale } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { i18nField } from "shared";

import { useSellerProfiles } from "./useSellerProfiles";

import type { CartItem, SellerGroup } from "@/features/checkout/domain/types";
import {
  readCartFromCookie,
  subscribeToCartCookie,
} from "@/features/checkout/infrastructure/cartCookie";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";

/** Stable empty array so the server snapshot reference never changes. */
const EMPTY: CartItem[] = [];

function getSnapshot(): CartItem[] {
  return readCartFromCookie();
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

/**
 * Reads the cart from the cookie, groups items by seller,
 * and resolves seller display names.
 */
export function useCartFromCookie() {
  const locale = useLocale();
  const items = useSyncExternalStore(
    subscribeToCartCookie,
    getSnapshot,
    getServerSnapshot,
  );
  const isHydrated = items !== EMPTY;

  const sellerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      if (item.seller_id) ids.add(item.seller_id);
    }
    return [...ids];
  }, [items]);

  const { data: sellerNames, isLoading: isLoadingProfiles } =
    useSellerProfiles(sellerIds);

  const groups: SellerGroup[] = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of items) {
      const key = item.seller_id ?? "unknown";
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }

    return [...map.entries()].map(([sellerId, sellerItems]) => ({
      sellerId,
      sellerName: sellerNames?.[sellerId] ?? FALLBACK_SELLER_NAME,
      items: sellerItems,
      subtotalCop: sellerItems.reduce(
        (sum, item) => sum + item.price_cop * item.quantity,
        0,
      ),
    }));
  }, [items, sellerNames]);

  const isEmpty = isHydrated && items.length === 0;
  const isLoading = !isHydrated || isLoadingProfiles;

  const getItemName = (item: CartItem) => i18nField(item, "name", locale);

  return { groups, isEmpty, isLoading, getItemName };
}
