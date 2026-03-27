import type { createBrowserSupabaseClient } from "api/supabase";

import {
  FALLBACK_SELLER_NAME,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  ORDER_EXPIRY_HOURS,
  SECONDS_PER_MINUTE,
} from "@/features/checkout/domain/constants";
import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

/**
 * The generated Supabase types don't include tables added in recent migrations
 * (seller_payment_methods, payment_method_types, user_profiles, new order columns,
 * reserve_stock / release_stock RPCs).
 *
 * We use a loosely-typed cast for those specific queries until `pnpm codegen`
 * regenerates the types with the latest schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, sonarjs/redundant-type-aliases -- intentional alias for untyped Supabase tables
type UntypedClient = any;

interface PaymentMethodRow {
  id: string;
  account_details_en: string | null;
  account_details_es: string | null;
  seller_note_en: string | null;
  seller_note_es: string | null;
  payment_method_types: {
    name_en: string;
    name_es: string;
    icon: string | null;
    requires_receipt: boolean;
    requires_transfer_number: boolean;
  };
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
}

/**
 * Fetch a seller's active payment methods joined with their type info.
 */
export async function fetchSellerPaymentMethods(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerPaymentMethodWithType[]> {
  const client = supabase as UntypedClient;

  /* eslint-disable i18next/no-literal-string -- Supabase query DSL, not user-facing text */
  const { data, error } = await client
    .from("seller_payment_methods")
    .select(
      `
      id,
      account_details_en,
      account_details_es,
      seller_note_en,
      seller_note_es,
      payment_method_types!inner (
        name_en,
        name_es,
        icon,
        requires_receipt,
        requires_transfer_number
      )
    `,
    )
    .eq("seller_id", sellerId)
    .eq("is_active", true)
    .order("sort_order");
  /* eslint-enable i18next/no-literal-string */

  if (error) throw error;

  return ((data ?? []) as PaymentMethodRow[]).map((row) => ({
    id: row.id,
    type_name_en: row.payment_method_types.name_en,
    type_name_es: row.payment_method_types.name_es,
    type_icon: row.payment_method_types.icon,
    requires_receipt: row.payment_method_types.requires_receipt,
    requires_transfer_number: row.payment_method_types.requires_transfer_number,
    account_details_en: row.account_details_en,
    account_details_es: row.account_details_es,
    seller_note_en: row.seller_note_en,
    seller_note_es: row.seller_note_es,
  }));
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
  const client = supabase as UntypedClient;
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
    const { data: success, error } = await client.rpc("reserve_stock", {
      p_product_id: item.id,
      p_quantity: item.quantity,
    });

    if (error || !success) {
      // Release already-reserved items
      for (const r of reserved) {
        await client.rpc("release_stock", {
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

  // Insert order (uses new columns not yet in generated types)
  const { data: order, error: orderError } = await client
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
      await client.rpc("release_stock", {
        p_product_id: r.productId,
        p_quantity: r.quantity,
      });
    }
    throw orderError ?? new Error("Failed to create order");
  }

  const orderId = (order as { id: string }).id;

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
): Promise<void> {
  const client = supabase as UntypedClient;

  const { error } = await client
    .from("orders")
    .update({
      transfer_number: transferNumber,
      receipt_url: receiptUrl,
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

  const client = supabase as UntypedClient;

  /* eslint-disable i18next/no-literal-string -- Supabase query DSL, not user-facing text */
  const { data, error } = await client
    .from("user_profiles")
    .select("id, display_name, email")
    .in("id", sellerIds);
  /* eslint-enable i18next/no-literal-string */

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const profile of (data ?? []) as ProfileRow[]) {
    map[profile.id] =
      profile.display_name ?? profile.email ?? FALLBACK_SELLER_NAME;
  }
  return map;
}
