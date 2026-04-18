import type {
  DelegatePermission,
  SellerAdmin,
} from "@/features/seller-admins/domain/types";
import { validateDelegateInput } from "@/features/seller-admins/domain/validation";
import type { SupabaseClient } from "@/shared/domain/types";

/**
 * Add a new delegate for a seller, scoped to a specific product.
 * Validates input before inserting into `seller_admins`.
 */
export async function addDelegate(
  supabase: SupabaseClient,
  sellerId: string,
  adminUserId: string,
  permissions: DelegatePermission[],
  productId: string,
): Promise<SellerAdmin> {
  validateDelegateInput(sellerId, adminUserId, permissions);

  const { data, error } = await supabase
    .from("seller_admins")
    .insert({
      seller_id: sellerId,
      admin_user_id: adminUserId,
      permissions,
      product_id: productId,
    })
    .select()
    .single();

  if (error) throw error;

  return data as unknown as SellerAdmin;
}

/**
 * Update the permissions for an existing delegate.
 */
export async function updateDelegatePermissions(
  supabase: SupabaseClient,
  sellerId: string,
  adminUserId: string,
  permissions: DelegatePermission[],
): Promise<void> {
  validateDelegateInput(sellerId, adminUserId, permissions);

  const { error } = await supabase
    .from("seller_admins")
    .update({ permissions })
    .eq("seller_id", sellerId)
    .eq("admin_user_id", adminUserId);

  if (error) throw error;
}

/**
 * Remove a delegate by deleting the `seller_admins` row
 * matching the `(seller_id, admin_user_id, product_id)` triple.
 */
export async function removeDelegate(
  supabase: SupabaseClient,
  sellerId: string,
  adminUserId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from("seller_admins")
    .delete()
    .eq("seller_id", sellerId)
    .eq("admin_user_id", adminUserId)
    .eq("product_id", productId);

  if (error) throw error;
}
