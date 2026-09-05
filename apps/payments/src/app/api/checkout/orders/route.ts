/* eslint-disable i18next/no-literal-string -- route uses internal table names and API keys */
import { getCurrentUserId } from "api/supabase";
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type { FormField } from "@/shared/domain/PaymentMethodTypes";
import { validateBuyerSubmission } from "@/shared/domain/paymentMethodUtils";
import {
  adminFetchJson,
  UUID_REGEX,
} from "@/shared/infrastructure/adminRestClient";

type PaymentMethodRow = {
  seller_id: string;
  form_fields: unknown;
};

async function fetchPaymentMethod(
  paymentMethodId: string,
): Promise<PaymentMethodRow | null> {
  const rows = await adminFetchJson<PaymentMethodRow[]>(
    `seller_payment_methods?id=eq.${encodeURIComponent(paymentMethodId)}&select=seller_id,form_fields`,
  );
  return rows[0] ?? null;
}

type ProductRow = {
  id: string;
  price: number;
  currency: string;
  max_quantity: number;
  is_active: boolean;
  seller_id: string;
};

async function fetchProductData(
  productIds: string[],
): Promise<Map<string, ProductRow>> {
  if (productIds.length === 0) return new Map();
  const idList = productIds.map((id) => encodeURIComponent(id)).join(",");
  const rows = await adminFetchJson<ProductRow[]>(
    `products?id=in.(${idList})&select=id,price,currency,max_quantity,is_active,seller_id`,
  );
  return new Map(rows.map((r) => [r.id, r]));
}

type OrderRow = { id: string };

async function insertOrder(params: {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  total: number;
  currency: string;
  buyerInfo: Record<string, string>;
}): Promise<string> {
  const rows = await adminFetchJson<OrderRow[]>("orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: params.userId,
      seller_id: params.sellerId,
      payment_method_id: params.paymentMethodId,
      total: params.total,
      currency: params.currency,
      payment_status: "pending_verification",
      buyer_info: params.buyerInfo,
    }),
  });

  const row = rows[0];
  if (!row?.id) throw new Error("Order insert returned no id");
  return row.id;
}

async function insertOrderItems(
  orderId: string,
  items: Array<{ id: string; quantity: number }>,
  productMap: Map<string, ProductRow>,
): Promise<void> {
  const orderItems = items.map((item) => {
    const product = productMap.get(item.id);
    if (!product) throw new Error(`Missing product data for ${item.id}`);
    return {
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: product.price,
      currency: product.currency,
    };
  });

  await adminFetchJson<unknown>("order_items", {
    method: "POST",
    body: JSON.stringify(orderItems),
  });
}

function isValidItem(item: unknown): item is { id: string; quantity: number } {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  if (typeof obj.id !== "string" || !UUID_REGEX.test(obj.id)) return false;
  if (typeof obj.quantity !== "number" || !Number.isInteger(obj.quantity))
    return false;
  return (obj.quantity as number) > 0;
}

/**
 * Sums the quantities of repeated product ids into one line each.
 *
 * SEC-001 is checked per line, so without this a cart could name the same
 * product twice with each line inside `max_quantity` and the total outside it:
 * two lines of 5 against a stock of 8 both pass, and an order for 10 units is
 * written. `/api/checkout/payment-methods` has always merged before comparing,
 * which is why it reported a stock issue and withheld the seller's payment
 * details for the same cart -- the two endpoints disagreed, and the one that
 * writes was the permissive one.
 *
 * Merging rather than rejecting also fixes the order itself: `order_items` has
 * no unique constraint on (order_id, product_id), so duplicate lines were
 * written as separate rows for one product.
 */
function mergeByProduct(
  items: Array<{ id: string; quantity: number }>,
): Array<{ id: string; quantity: number }> {
  const quantitiesById = new Map<string, number>();
  for (const item of items) {
    quantitiesById.set(
      item.id,
      (quantitiesById.get(item.id) ?? 0) + item.quantity,
    );
  }
  return [...quantitiesById.entries()].map(([id, quantity]) => ({
    id,
    quantity,
  }));
}

type ParsedPayload =
  | {
      ok: true;
      paymentMethodId: string;
      submission: Record<string, string>;
      cartItems: Array<{ id: string; quantity: number }>;
    }
  | { ok: false; response: NextResponse };

function parseAndValidatePayload(body: {
  payment_method_id?: unknown;
  buyer_submission?: unknown;
  items?: unknown;
}): ParsedPayload {
  const { payment_method_id, buyer_submission, items } = body;
  const invalidPayload = NextResponse.json(
    { error: "Invalid payload" },
    { status: 400 },
  );

  if (
    typeof payment_method_id !== "string" ||
    payment_method_id.length === 0 ||
    typeof buyer_submission !== "object" ||
    buyer_submission === null ||
    !UUID_REGEX.test(payment_method_id)
  ) {
    return { ok: false, response: invalidPayload };
  }

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !items.every((item) => isValidItem(item))
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Invalid items: must be a non-empty array of {id: uuid, quantity: positive integer}",
        },
        { status: 400 },
      ),
    };
  }

  if (
    Object.values(buyer_submission as Record<string, unknown>).some(
      (v) => typeof v !== "string",
    )
  ) {
    return { ok: false, response: invalidPayload };
  }

  return {
    ok: true,
    paymentMethodId: payment_method_id,
    submission: buyer_submission as Record<string, string>,
    cartItems: mergeByProduct(items),
  };
}

type CartValidationResult =
  | { ok: true; total: number; currency: string }
  | { ok: false; error: string; status: number };

function validateCartItems(
  cartItems: Array<{ id: string; quantity: number }>,
  productMap: Map<string, ProductRow>,
  sellerId: string,
): CartValidationResult {
  let total = 0;
  let currency = "";
  for (const item of cartItems) {
    const product = productMap.get(item.id);
    if (!product) {
      return { ok: false, error: `Product ${item.id} not found`, status: 422 };
    }
    // SEC-002: All products must belong to the same seller as the payment method
    if (product.seller_id !== sellerId) {
      return {
        ok: false,
        error: `Product ${item.id} does not belong to this seller`,
        status: 422,
      };
    }
    // SEC-001: Product must be active and have sufficient stock
    if (!product.is_active) {
      return {
        ok: false,
        error: `Product ${item.id} is no longer available`,
        status: 422,
      };
    }
    if (item.quantity > product.max_quantity) {
      return {
        ok: false,
        error: `Product ${item.id} only has ${product.max_quantity} units available`,
        status: 422,
      };
    }
    if (currency === "") {
      currency = product.currency;
    } else if (currency !== product.currency) {
      return {
        ok: false,
        error: "All products in a cart must share the same currency",
        status: 422,
      };
    }
    total += product.price * item.quantity;
  }
  return { ok: true, total, currency };
}

export async function POST(request: Request) {
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId(sessionSupabase);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      payment_method_id?: unknown;
      buyer_submission?: unknown;
      items?: unknown;
    };

    const parsed = parseAndValidatePayload(body);
    if (!parsed.ok) return parsed.response;

    const { paymentMethodId, submission, cartItems } = parsed;

    const method = await fetchPaymentMethod(paymentMethodId);
    if (!method) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    const formFields = Array.isArray(method.form_fields)
      ? (method.form_fields as FormField[])
      : [];
    const missingFields = validateBuyerSubmission(formFields, submission);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "missing_fields", fields: missingFields },
        { status: 422 },
      );
    }

    const productMap = await fetchProductData(cartItems.map((item) => item.id));
    const cartValidation = validateCartItems(
      cartItems,
      productMap,
      method.seller_id,
    );
    if (!cartValidation.ok) {
      return NextResponse.json(
        { error: cartValidation.error },
        { status: cartValidation.status },
      );
    }

    const orderId = await insertOrder({
      userId,
      sellerId: method.seller_id,
      paymentMethodId,
      total: cartValidation.total,
      currency: cartValidation.currency,
      buyerInfo: submission,
    });

    await insertOrderItems(orderId, cartItems, productMap);

    return NextResponse.json({ orderId }, { status: 201 });
  } catch (error) {
    console.error(
      "[checkout/orders]",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
