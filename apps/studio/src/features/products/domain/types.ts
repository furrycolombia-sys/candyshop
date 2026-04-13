import type { Tables } from "api/supabase/types";

/** Product row from Supabase */
export type Product = Tables<"products">;

/** Filter parameters for product queries */
export interface ProductFilters {
  type: string;
  category: string;
  q: string;
}
