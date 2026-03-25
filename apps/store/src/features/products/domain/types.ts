import type { Tables } from "api/types/database";

/** Product type — directly from Supabase generated types (single source of truth) */
export type Product = Tables<"products">;

// ---------------------------------------------------------------------------
// JSONB field shapes — these describe the structure inside Json columns
// ---------------------------------------------------------------------------

/** Shape of a single highlight entry inside `products.highlights` (Json) */
export interface ProductHighlight {
  icon: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
}

/** Shape of a single FAQ entry inside `products.faq` (Json) */
export interface ProductFaq {
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
}

/** Shape of a single screenshot entry inside `products.screenshots` (Json) */
export interface ProductScreenshot {
  url?: string;
  caption_en?: string;
  caption_es?: string;
}

/** Shape of a single image entry inside `products.images` (Json) */
export interface ProductImage {
  url: string;
  alt?: string;
}

/** A simple label/value row for the specifications table */
export interface ProductSpec {
  label: string;
  value: string;
}
