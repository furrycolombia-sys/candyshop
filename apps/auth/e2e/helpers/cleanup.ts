import { adminDelete, adminQuery, supabaseAdmin } from "./session";

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
      // 6. Delete buyer user
      await supabaseAdmin.auth.admin.deleteUser(buyerUserId);
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
      // 6. Delete seller user
      await supabaseAdmin.auth.admin.deleteUser(sellerUserId);
    }
  } catch (error) {
    console.error("[E2E cleanup] Error during cleanup:", error);
    if (sellerUserId)
      await supabaseAdmin.auth.admin.deleteUser(sellerUserId).catch(() => {});
    if (buyerUserId)
      await supabaseAdmin.auth.admin.deleteUser(buyerUserId).catch(() => {});
  }
}
