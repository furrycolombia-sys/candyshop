/** Permission keys that can be delegated to admin users */
export type DelegatePermission = "orders.approve" | "orders.request_proof";

/** A seller-admin delegation row from the `seller_admins` table */
export interface SellerAdmin {
  id: string;
  seller_id: string;
  admin_user_id: string;
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

/** Context describing a delegation relationship for order views */
export interface DelegatedOrderContext {
  seller_id: string;
  seller_display_name: string | null;
  permissions: DelegatePermission[];
}

/** An action a delegate can perform on an order */
export interface OrderAction {
  orderId: string;
  action: "approve" | "request_proof";
  seller_note?: string;
}
