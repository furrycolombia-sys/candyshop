/* eslint-disable i18next/no-literal-string -- route uses internal table names and API keys */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type { FormField } from "@/shared/domain/paymentMethodTypes";
import { validateBuyerSubmission } from "@/shared/domain/paymentMethodUtils";

// Dynamic key access prevents Turbopack from inlining at build time.
const supabaseUrl =
  process.env["SUPABASE_URL_INTERNAL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getRestHeaders() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin REST client is not configured");
  }
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function getRestUrl(path: string) {
  if (!supabaseUrl) throw new Error("Supabase URL is not configured");
  return `${supabaseUrl}/rest/v1/${path}`;
}

async function adminFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getRestUrl(path), {
    ...init,
    headers: { ...getRestHeaders(), ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

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
      total_cop?: unknown;
    };

    const { payment_method_id, buyer_submission, total_cop } = body;

    if (
      typeof payment_method_id !== "string" ||
      payment_method_id.length === 0 ||
      typeof buyer_submission !== "object" ||
      buyer_submission === null
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const submission = buyer_submission as Record<string, string>;
    const totalCop =
      typeof total_cop === "number" && Number.isFinite(total_cop)
        ? total_cop
        : 0;

    // Fetch payment method to get seller_id and form_fields
    const method = await fetchPaymentMethod(payment_method_id);
    if (!method) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    // Validate required form fields
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

    // Insert order with buyer_info
    const orderId = await insertOrder({
      userId: user.id,
      sellerId: method.seller_id,
      paymentMethodId: payment_method_id,
      totalCop,
      buyerInfo: submission,
    });

    return NextResponse.json({ orderId }, { status: 201 });
  } catch (error) {
    console.error("[checkout/orders]", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
