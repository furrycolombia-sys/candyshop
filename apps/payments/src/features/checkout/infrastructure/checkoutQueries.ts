/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import {
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  ORDER_EXPIRY_HOURS,
  SECONDS_PER_MINUTE,
} from "@/features/checkout/domain/constants";
import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";
import type { SupabaseClient } from "@/shared/domain/types";

/**
 * Fetch a seller's active payment methods directly from seller_payment_methods.
 */
export async function fetchSellerPaymentMethods(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerPaymentMethodWithType[]> {
  const { data, error } = await supabase
    .from("seller_payment_methods" as never)
    .select("id, name_en, name_es, display_blocks, form_fields, is_active")
    .eq("seller_id" as never, sellerId)
    .eq("is_active" as never, true)
    .order("sort_order" as never);

  if (error) throw error;

  return ((data ?? []) as unknown as SellerPaymentMethodWithType[]).map(
    (row) => ({
      id: row.id,
      name_en: row.name_en,
      name_es: row.name_es ?? null,
      display_blocks: Array.isArray(row.display_blocks)
        ? row.display_blocks
        : [],
      form_fields: Array.isArray(row.form_fields) ? row.form_fields : [],
      is_active: row.is_active,
    }),
  );
}

interface CreateOrderParams {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  items: CartItem[];
  totalCop: number;
  checkoutSessionId: string;
}

/**
 * Create an order, reserving stock atomically for each item.
 * If any reservation fails, already-reserved items are released.
 */
export async function createOrder(
  supabase: SupabaseClient,
  params: CreateOrderParams,
): Promise<string> {
  const {
    userId,
    sellerId,
    paymentMethodId,
    items,
    totalCop,
    checkoutSessionId,
  } = params;

  // Reserve stock for each item
  const reserved: Array<{ productId: string; quantity: number }> = [];

  for (const item of items) {
    const { data: success, error } = await supabase.rpc("reserve_stock", {
      p_product_id: item.id,
      p_quantity: item.quantity,
    });

    if (error || !success) {
      // Release already-reserved items
      for (const r of reserved) {
        await supabase.rpc("release_stock", {
          p_product_id: r.productId,
          p_quantity: r.quantity,
        });
      }
      throw new Error("stock_error");
    }

    reserved.push({ productId: item.id, quantity: item.quantity });
  }

  // Calculate expiry
  const expiresAt = new Date(
    Date.now() +
      ORDER_EXPIRY_HOURS *
        MINUTES_PER_HOUR *
        SECONDS_PER_MINUTE *
        MS_PER_SECOND,
  ).toISOString();

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      seller_id: sellerId,
      payment_method_id: paymentMethodId,
      total_cop: totalCop,
      payment_status: "awaiting_payment",
      checkout_session_id: checkoutSessionId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Release stock on order insert failure
    for (const r of reserved) {
      await supabase.rpc("release_stock", {
        p_product_id: r.productId,
        p_quantity: r.quantity,
      });
    }
    throw orderError ?? new Error("Failed to create order");
  }

  const orderId = order.id;

  // Insert order items
  const orderItems = items.map((item) => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.quantity,
    unit_price_cop: item.price_cop,
    metadata: { name_en: item.name_en, name_es: item.name_es },
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return orderId;
}

/**
 * Update an order with receipt information and set status to pending_verification.
 */
export async function submitReceipt(
  supabase: SupabaseClient,
  orderId: string,
  transferNumber: string | null,
  receiptUrl: string | null,
  buyerInfo: Record<string, string> = {},
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      transfer_number: transferNumber,
      receipt_url: receiptUrl,
      buyer_info: Object.keys(buyerInfo).length > 0 ? buyerInfo : null,
      payment_status: "pending_verification",
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Fetch display names from user_profiles for a list of seller IDs.
 */
export async function fetchSellerProfiles(
  supabase: SupabaseClient,
  sellerIds: string[],
): Promise<Record<string, string>> {
  if (sellerIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, display_name, email")
    .in("id", sellerIds);

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const profile of data ?? []) {
    map[profile.id] =
      profile.display_name ?? profile.email ?? FALLBACK_SELLER_NAME;
  }
  return map;
}
