import { createBrowserSupabaseClient } from "api/supabase";

export async function fetchStoreProducts() {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
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
