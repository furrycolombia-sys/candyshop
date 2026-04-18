/* eslint-disable i18next/no-literal-string -- route uses internal table names and API keys */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type { FormField } from "@/shared/domain/paymentMethodTypes";
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
  price_cop: number;
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
    `products?id=in.(${idList})&select=id,price_cop,max_quantity,is_active,seller_id`,
  );
  return new Map(rows.map((r) => [r.id, r]));
}

type OrderRow = { id: string };

async function insertOrder(params: {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  totalCop: number;
  buyerInfo: Record<string, string>;
}): Promise<string> {
  const rows = await adminFetchJson<OrderRow[]>("orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: params.userId,
      seller_id: params.sellerId,
      payment_method_id: params.paymentMethodId,
      total_cop: params.totalCop,
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
      unit_price_cop: product.price_cop,
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
    cartItems: items,
  };
}

type CartValidationResult =
  | { ok: true; totalCop: number }
  | { ok: false; error: string; status: number };

function validateCartItems(
  cartItems: Array<{ id: string; quantity: number }>,
  productMap: Map<string, ProductRow>,
  sellerId: string,
): CartValidationResult {
  let totalCop = 0;
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
    totalCop += product.price_cop * item.quantity;
  }
  return { ok: true, totalCop };
}

export async function POST(request: Request) {
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();

    if (!user) {
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
      userId: user.id,
      sellerId: method.seller_id,
      paymentMethodId,
      totalCop: cartValidation.totalCop,
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
