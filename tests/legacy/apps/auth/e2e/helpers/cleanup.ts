import { adminDelete, adminQuery, deleteClerkUserBySub } from "./session";

/**
 * Delete a `user_profiles` row and, if it was still linked to a Clerk
 * identity, that Clerk user too. `user_profiles` has no FK to any identity
 * table anymore (see supabase/migrations/20260829140000_drop_auth_users_coupling.sql),
 * so nothing deletes it automatically — this must be explicit.
 */
async function deleteProfile(userId: string): Promise<void> {
  const rows = await adminQuery(
    "user_profiles",
    `id=eq.${userId}&select=identity_sub`,
  );
  const identitySub = rows[0]?.identity_sub as string | null | undefined;

  await adminDelete("user_profiles", `id=eq.${userId}`);

  if (identitySub) await deleteClerkUserBySub(identitySub);
}

/**
 * Delete all test data created during the E2E test.
 * Uses admin REST API to bypass RLS.
 * Order matters — foreign keys require specific deletion order.
 */
export async function cleanupTestData(
  sellerUserId: string,
  buyerUserId: string,
): Promise<void> {
  try {
    // 1. Delete order items for buyer's orders
    if (buyerUserId) {
      const orders = await adminQuery("orders", `user_id=eq.${buyerUserId}`);
      for (const order of orders) {
        await adminDelete("order_items", `order_id=eq.${order.id}`);
      }
      // 2. Delete orders
      await adminDelete("orders", `user_id=eq.${buyerUserId}`);
      // 5. Delete buyer permissions
      await adminDelete("user_permissions", `user_id=eq.${buyerUserId}`);
      // 6. Delete buyer profile + Clerk user
      await deleteProfile(buyerUserId);
    }

    if (sellerUserId) {
      // 3. Delete seller's payment methods
      await adminDelete(
        "seller_payment_methods",
        `seller_id=eq.${sellerUserId}`,
      );
      // 4. Delete seller's products
      await adminDelete("products", `seller_id=eq.${sellerUserId}`);
      // 5. Delete seller permissions
      await adminDelete("user_permissions", `user_id=eq.${sellerUserId}`);
      // 6. Delete seller profile + Clerk user
      await deleteProfile(sellerUserId);
    }
  } catch (error) {
    console.error("[E2E cleanup] Error during cleanup:", error);
    if (sellerUserId) await deleteProfile(sellerUserId).catch(() => {});
    if (buyerUserId) await deleteProfile(buyerUserId).catch(() => {});
  }
}
