import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/supabase/types";

type SupabaseDB = SupabaseClient<Database>;
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

/** Fetch a single product by ID for the edit form */
export async function fetchProductById(supabase: SupabaseDB, id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Get the next sort_order value (max + 1) */
async function getNextSortOrder(supabase: SupabaseDB): Promise<number> {
  const { data } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  return (data?.sort_order ?? 0) + 1;
}

/** Insert a new product (auto-assigns sort_order and seller_id) */
export async function insertProduct(supabase: SupabaseDB, data: ProductInsert) {
  const sortOrder = await getNextSortOrder(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...data, sort_order: sortOrder, seller_id: user?.id ?? null })
    .select()
    .single();

  if (error) throw error;
  return product;
}

/** Update an existing product by ID */
export async function updateProduct(
  supabase: SupabaseDB,
  id: string,
  data: ProductUpdate,
) {
  const { data: product, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return product;
}
