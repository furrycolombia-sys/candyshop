/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import type { Database } from "api/supabase/types";

import {
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  ORDER_EXPIRY_HOURS,
  SECONDS_PER_MINUTE,
  STOCK_ERROR_CODE,
} from "@/features/checkout/domain/constants";
import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";
import type { SupabaseClient } from "@/shared/domain/types";
import { fetchUserDisplayNames } from "@/shared/infrastructure/fetchUserDisplayNames";

type CurrencyCode = Database["public"]["Enums"]["currency_code"];

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
  checkoutSessionId: string;
}

export async function fetchCheckoutProductsByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Array<Omit<CartItem, "quantity">>> {
  if (ids.length === 0) return [];

  const uniqueIds = [...new Set(ids)];
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name_en, name_es, price, currency, seller_id, images, max_quantity, is_active",
    )
    .in("id", uniqueIds)
    .eq("is_active", true);

  if (error) throw error;

  return (data ?? []).map((product) => ({
    id: product.id,
    name_en: product.name_en,
    name_es: product.name_es,
    price: product.price,
    currency: product.currency,
    seller_id: product.seller_id,
    images: product.images,
    max_quantity: product.max_quantity,
  }));
}

async function releaseReservedStock(
  supabase: SupabaseClient,
  reserved: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  for (const r of reserved) {
    try {
      await supabase.rpc("release_stock", {
        p_product_id: r.productId,
        p_quantity: r.quantity,
      });
    } catch (error) {
      console.error("Failed to release stock for", r.productId, error);
    }
  }
}

/**
 * Create an order, reserving stock atomically for each item.
 * If any reservation fails, already-reserved items are released.
 */
export async function createOrder(
  supabase: SupabaseClient,
  params: CreateOrderParams,
): Promise<string> {
  const { userId, sellerId, paymentMethodId, items, checkoutSessionId } =
    params;

  // Fetch current prices from DB to prevent price manipulation via cart cookie
  const { data: productPrices, error: pricesError } = await supabase
    .from("products")
    .select("id, price, currency")
    .in(
      "id",
      items.map((item) => item.id),
    );
  if (pricesError) throw pricesError;

  const priceMap = new Map(
    (productPrices ?? []).map((p) => [
      p.id,
      { price: p.price as number, currency: p.currency as CurrencyCode },
    ]),
  );

  if (priceMap.size === 0) throw new Error("No products found for this order");

  // Calculate total server-side from DB prices (never trust client-provided total)
  // All items in a seller group share the same currency
  const firstItem = priceMap.values().next().value;
  const orderCurrency = firstItem?.currency ?? "USD";

  const serverTotal = items.reduce((sum, item) => {
    const dbProduct = priceMap.get(item.id);
    if (dbProduct === undefined)
      throw new Error(`Product ${item.id} not found`);
    return sum + dbProduct.price * item.quantity;
  }, 0);

  // Reserve stock for each item
  const reserved: Array<{ productId: string; quantity: number }> = [];

  for (const item of items) {
    const { data: success, error } = await supabase.rpc("reserve_stock", {
      p_product_id: item.id,
      p_quantity: item.quantity,
    });

    if (error || !success) {
      // Release already-reserved items — best-effort: continue even if individual releases fail
      await releaseReservedStock(supabase, reserved);
      throw new Error(STOCK_ERROR_CODE);
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

  // Insert order with server-calculated total
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      seller_id: sellerId,
      payment_method_id: paymentMethodId,
      total: serverTotal,
      currency: orderCurrency,
      payment_status: "awaiting_payment",
      checkout_session_id: checkoutSessionId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Release stock on order insert failure — best-effort: continue even if individual releases fail
    await releaseReservedStock(supabase, reserved);
    throw orderError ?? new Error("Failed to create order");
  }

  const orderId = order.id;

  // Build order items using DB prices
  const orderItems = items.map((item) => {
    const dbProduct = priceMap.get(item.id) ?? {
      price: 0,
      currency: "USD" as CurrencyCode,
    };
    return {
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: dbProduct.price,
      currency: dbProduct.currency,
      metadata: { name_en: item.name_en ?? "", name_es: item.name_es ?? "" },
    };
  });

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
 * Delegates to the shared fetchUserDisplayNames utility.
 */
export async function fetchSellerProfiles(
  supabase: SupabaseClient,
  sellerIds: string[],
): Promise<Record<string, string>> {
  return fetchUserDisplayNames(supabase, sellerIds, FALLBACK_SELLER_NAME);
}
