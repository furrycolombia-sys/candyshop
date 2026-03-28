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
    const orders = await adminQuery("orders", `user_id=eq.${buyerUserId}`);
    for (const order of orders) {
      await adminDelete("order_items", `order_id=eq.${order.id}`);
    }

    // 2. Delete orders
    await adminDelete("orders", `user_id=eq.${buyerUserId}`);

    // 3. Delete seller's payment methods
    await adminDelete("seller_payment_methods", `seller_id=eq.${sellerUserId}`);

    // 4. Delete seller's products
    await adminDelete("products", `seller_id=eq.${sellerUserId}`);

    // 5. Delete both users
    await supabaseAdmin.auth.admin.deleteUser(sellerUserId);
    await supabaseAdmin.auth.admin.deleteUser(buyerUserId);
  } catch (error) {
    console.error("[E2E cleanup] Error during cleanup:", error);
    // Still try to delete users even if data cleanup fails
    await supabaseAdmin.auth.admin.deleteUser(sellerUserId).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(buyerUserId).catch(() => {});
  }
}
