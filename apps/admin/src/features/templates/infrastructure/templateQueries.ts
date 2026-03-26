import type { createBrowserSupabaseClient } from "api/supabase";

import type {
  ProductTemplate,
  TemplateFormValues,
} from "@/features/templates/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const TABLE = "product_templates" as any;

/** Fetch all templates ordered by sort_order */
export async function fetchTemplates(
  supabase: SupabaseClient,
): Promise<ProductTemplate[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as unknown as ProductTemplate[];
}

/** Fetch only active templates ordered by sort_order */
export async function fetchActiveTemplates(
  supabase: SupabaseClient,
): Promise<ProductTemplate[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as unknown as ProductTemplate[];
}

/** Create a new template */
export async function insertTemplate(
  supabase: SupabaseClient,
  values: TemplateFormValues,
): Promise<ProductTemplate> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as ProductTemplate;
}

/** Update an existing template */
export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  values: Partial<TemplateFormValues>,
): Promise<ProductTemplate> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as ProductTemplate;
}

/** Delete a template by ID */
export async function deleteTemplate(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;
}

/** Toggle the is_active field on a template */
export async function toggleTemplateActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}
