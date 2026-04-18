import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/supabase/types";

import type {
  ProductFilters,
  ReorderItem,
} from "@/features/products/domain/types";

type SupabaseDB = SupabaseClient<Database>;

/** Fetch products owned by the current user, with optional filters */
export async function fetchProducts(
  supabase: SupabaseDB,
  filters?: Partial<ProductFilters>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from("products")
    .select("*")
    .eq("seller_id", user.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (filters?.type) {
    query = query.eq(
      "type",
      filters.type as Database["public"]["Enums"]["product_type"],
    );
  }

  if (filters?.category) {
    query = query.eq(
      "category",
      filters.category as Database["public"]["Enums"]["product_category"],
    );
  }

  if (filters?.q) {
    const searchFilter = `name_en.ilike.%${filters.q}%,name_es.ilike.%${filters.q}%`; // eslint-disable-line i18next/no-literal-string -- Supabase PostgREST filter syntax
    query = query.or(searchFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/** Toggle a boolean field on a product (is_active, featured) */
export async function toggleProductField(
  supabase: SupabaseDB,
  id: string,
  field: "is_active" | "featured",
  value: boolean,
) {
  const update =
    field === "is_active" ? { is_active: value } : { featured: value };
  const { error } = await supabase.from("products").update(update).eq("id", id);

  if (error) throw error;
}

/** Delete a product by ID */
export async function deleteProduct(supabase: SupabaseDB, id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw error;
}

/** Batch-update sort_order for a list of products */
export async function reorderProducts(
  supabase: SupabaseDB,
  items: ReorderItem[],
) {
  const updates = items.map((item) =>
    supabase
      .from("products")
      .update({ sort_order: item.sortOrder })
      .eq("id", item.id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
