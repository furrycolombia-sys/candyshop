import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/types/database";

import type { ProductFilters } from "@/features/products/domain/types";

type SupabaseDB = SupabaseClient<Database>;

/** Fetch products with optional filters */
export async function fetchProducts(
  supabase: SupabaseDB,
  filters?: Partial<ProductFilters>,
) {
  let query = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

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
  const { error } = await supabase
    .from("products")
    .update({ [field]: value })
    .eq("id", id);

  if (error) throw error;
}

/** Delete a product by ID */
export async function deleteProduct(supabase: SupabaseDB, id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw error;
}
