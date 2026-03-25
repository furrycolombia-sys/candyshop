import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/types/database";

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

/** Insert a new product */
export async function insertProduct(supabase: SupabaseDB, data: ProductInsert) {
  const { data: product, error } = await supabase
    .from("products")
    .insert(data)
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
