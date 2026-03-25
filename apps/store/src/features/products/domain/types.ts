import type { Tables } from "api/supabase/types";

/** Product type — directly from Supabase generated types (single source of truth) */
export type Product = Tables<"products">;

// Re-export shared types for convenience — components import from here
export type { ProductCategory, ProductType } from "shared/types";

// ---------------------------------------------------------------------------
// JSONB field shapes — these describe the structure inside Json columns
// ---------------------------------------------------------------------------

/** Shape of a single image entry inside `products.images` (Json) */
export interface ProductImage {
  url: string;
  alt?: string;
}
