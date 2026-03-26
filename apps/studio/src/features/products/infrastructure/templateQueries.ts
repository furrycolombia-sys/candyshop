import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "api/types/database";
import type { ProductSection } from "shared/types";

type SupabaseDB = SupabaseClient<Database>;

export interface ActiveTemplate {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  sections: ProductSection[];
}

export async function fetchActiveTemplates(
  supabase: SupabaseDB,
): Promise<ActiveTemplate[]> {
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not yet in generated Database types
    .from("product_templates" as any)
    // eslint-disable-next-line i18next/no-literal-string -- SQL column names, not user-facing
    .select("id, name_en, name_es, description_en, description_es, sections")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as unknown as ActiveTemplate[];
}
