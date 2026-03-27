"use client";

import { useLocale } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";

import { useSellerProfiles } from "./useSellerProfiles";

import type { CartItem, SellerGroup } from "@/features/checkout/domain/types";
import { readCartFromCookie } from "@/features/checkout/infrastructure/cartCookie";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";

/** Stable empty array so the server snapshot reference never changes. */
const EMPTY: CartItem[] = [];

/** Subscribe is a no-op — the cookie doesn't change while the page is open. */
function subscribe() {
  return () => {};
}

let cachedItems: CartItem[] | null = null;

function getSnapshot(): CartItem[] {
  if (cachedItems === null) {
    cachedItems = readCartFromCookie();
  }
  return cachedItems;
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
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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

  const getItemName = (item: CartItem) =>
    locale === "es" ? item.name_es : item.name_en;

  return { groups, isEmpty, isLoading, getItemName };
}
