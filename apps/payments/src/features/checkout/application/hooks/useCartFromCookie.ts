"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { i18nField, useSupabase } from "shared";
import type { CartCookieItem } from "shared/types";

import { useSellerProfiles } from "./useSellerProfiles";

import { CHECKOUT_CART_PRODUCTS_QUERY_KEY } from "@/features/checkout/domain/constants";
import type { CartItem, SellerGroup } from "@/features/checkout/domain/types";
import {
  readCartFromCookie,
  subscribeToCartCookie,
} from "@/features/checkout/infrastructure/cartCookie";
import { fetchCheckoutProductsByIds } from "@/features/checkout/infrastructure/checkoutQueries";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";

/** Stable empty array so the server snapshot reference never changes. */
const EMPTY_COOKIE_ITEMS: CartCookieItem[] = [];
const EMPTY_PRODUCTS: Array<Omit<CartItem, "quantity">> = [];

function getSnapshot(): CartCookieItem[] {
  return readCartFromCookie();
}

function getServerSnapshot(): CartCookieItem[] {
  return EMPTY_COOKIE_ITEMS;
}

/**
 * Reads the cart from the cookie, groups items by seller,
 * and resolves seller display names.
 */
export function useCartFromCookie() {
  const locale = useLocale();
  const supabase = useSupabase();
  const cookieItems = useSyncExternalStore(
    subscribeToCartCookie,
    getSnapshot,
    getServerSnapshot,
  );
  const isHydrated = cookieItems !== EMPTY_COOKIE_ITEMS;

  const cartIds = useMemo(
    () => cookieItems.map((item) => item.id),
    [cookieItems],
  );
  const { data: products = EMPTY_PRODUCTS, isLoading: isLoadingProducts } =
    useQuery({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase is not serializable (circular refs)
      queryKey: [CHECKOUT_CART_PRODUCTS_QUERY_KEY, cartIds],
      queryFn: () => fetchCheckoutProductsByIds(supabase, cartIds),
      enabled: cartIds.length > 0,
      staleTime: 30_000,
    });

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const items: CartItem[] = useMemo(
    () =>
      cookieItems
        .map((cookieItem) => {
          const product = productById.get(cookieItem.id);
          if (!product) return null;

          const maxQuantity =
            typeof product.max_quantity === "number"
              ? product.max_quantity
              : null;
          const quantity =
            maxQuantity === null
              ? cookieItem.quantity
              : Math.min(cookieItem.quantity, maxQuantity);

          return {
            ...product,
            quantity,
          };
        })
        .filter((item): item is CartItem => item !== null),
    [cookieItems, productById],
  );

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

  const isEmpty = isHydrated && !isLoadingProducts && items.length === 0;
  const isLoading = !isHydrated || isLoadingProducts || isLoadingProfiles;

  const getItemName = useCallback(
    (item: CartItem) => i18nField(item, "name", locale),
    [locale],
  );

  return { groups, isEmpty, isLoading, getItemName };
}
