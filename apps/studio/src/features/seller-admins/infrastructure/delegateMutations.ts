import type { createBrowserSupabaseClient } from "api/supabase";

import type {
  DelegatePermission,
  SellerAdmin,
} from "@/features/seller-admins/domain/types";
import { validateDelegateInput } from "@/features/seller-admins/domain/validation";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const SELLER_ADMINS_TABLE = "seller_admins" as any;

/**
 * Add a new delegate for a seller.
 * Validates input before inserting into `seller_admins`.
 */
export async function addDelegate(
  supabase: SupabaseClient,
  sellerId: string,
  adminUserId: string,
  permissions: DelegatePermission[],
): Promise<SellerAdmin> {
  validateDelegateInput(sellerId, adminUserId, permissions);

  const { data, error } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .insert({
      seller_id: sellerId,
      admin_user_id: adminUserId,
      permissions,
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
    .from(SELLER_ADMINS_TABLE)
    .update({ permissions })
    .eq("seller_id", sellerId)
    .eq("admin_user_id", adminUserId);

  if (error) throw error;
}

/**
 * Remove a delegate by deleting the `seller_admins` row.
 */
export async function removeDelegate(
  supabase: SupabaseClient,
  sellerId: string,
  adminUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .delete()
    .eq("seller_id", sellerId)
    .eq("admin_user_id", adminUserId);

  if (error) throw error;
}
