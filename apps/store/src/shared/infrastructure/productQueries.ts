import { createBrowserSupabaseClient } from "api/supabase";

/**
 * Fetch active products by id.
 *
 * Shared rather than part of features/products, because the cart is what needs
 * it: a cart cookie holds ids, and hydrating them into records is how the
 * drawer renders. That made features/cart import from features/products, which
 * the architecture rule forbids and which
 * scripts/check-feature-boundaries.mjs reports.
 *
 * The catalogue's own queries stay in the feature. This one is the interface
 * between two of them, which is what shared/ is for.
 */
export async function fetchStoreProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const supabase = createBrowserSupabaseClient();
  const uniqueIds = [...new Set(ids)];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", uniqueIds)
    .eq("is_active", true);

  if (error) throw error;
  return data ?? [];
}
