/** Product row from Supabase — imported from shared (single source of truth) */
export type { Product } from "shared/types";

/** Filter parameters for product queries */
export interface ProductFilters {
  type: string;
  category: string;
  q: string;
}

/** Item shape used when reordering products by sort_order */
export interface ReorderItem {
  id: string;
  sortOrder: number;
}
