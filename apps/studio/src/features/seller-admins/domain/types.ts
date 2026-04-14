import type { Tables } from "api/supabase/types";

/** Raw row from the seller_admins table */
export type SellerAdminRow = Tables<"seller_admins">;

/** Permission keys that can be delegated to admin users */
export type DelegatePermission = "orders.approve" | "orders.request_proof";

/** A seller-admin delegation row from the `seller_admins` table */
export interface SellerAdmin {
  id: string;
  seller_id: string;
  admin_user_id: string;
  product_id: string;
  permissions: DelegatePermission[];
  created_at: string;
  updated_at: string;
}

/** A delegate joined with their user profile */
export interface DelegateWithProfile extends SellerAdmin {
  admin_profile: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}
