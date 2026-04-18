import { createBrowserSupabaseClient } from "api/supabase";

export async function fetchStoreProducts() {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchStoreProductById(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

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
