import type { Tables } from "api/supabase/types";

/** Product row — directly from Supabase generated types (single source of truth) */
export type Product = Tables<"products">;

export type ProductType = "merch" | "digital" | "service" | "ticket";

export type ProductCategory =
  | "fursuits"
  | "merch"
  | "art"
  | "events"
  | "digital"
  | "deals";
