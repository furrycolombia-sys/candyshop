/* eslint-disable i18next/no-literal-string -- route uses internal table names and API keys */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";
import type { FormField } from "@/features/payment-methods/domain/types";
import { validateBuyerSubmission } from "@/features/payment-methods/domain/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getRestHeaders() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin REST client is not configured");
  }
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
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

async function fetchPaymentMethodFormFields(
  paymentMethodId: string,
): Promise<FormField[]> {
  const rows = await adminFetchJson<Array<{ form_fields: unknown }>>(
    `seller_payment_methods?id=eq.${paymentMethodId}&select=form_fields`,
  );
  if (rows.length === 0) return [];
  const raw = rows[0].form_fields;
  return Array.isArray(raw) ? (raw as FormField[]) : [];
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
      seller_id?: unknown;
      items?: unknown;
      total_cop?: unknown;
      checkout_session_id?: unknown;
      buyer_submission?: unknown;
    };

    const {
      payment_method_id,
      seller_id,
      items,
      total_cop,
      checkout_session_id,
      buyer_submission,
    } = body;

    // Basic validation
    const hasValidStrings =
      typeof payment_method_id === "string" &&
      typeof seller_id === "string" &&
      typeof checkout_session_id === "string";
    const hasValidPayload =
      hasValidStrings &&
      typeof total_cop === "number" &&
      Array.isArray(items) &&
      typeof buyer_submission === "object" &&
      buyer_submission !== null;

    if (!hasValidPayload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const submission = buyer_submission as Record<string, string>;

    // Fetch form fields and validate required fields
    const formFields = await fetchPaymentMethodFormFields(payment_method_id);
    const missingFields = validateBuyerSubmission(formFields, submission);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "missing_fields", fields: missingFields },
        { status: 422 },
      );
    }

    // Create order
    const orderId = await createOrder(sessionSupabase, {
      userId: user.id,
      sellerId: seller_id,
      paymentMethodId: payment_method_id,
      items: items as CartItem[],
      totalCop: total_cop,
      checkoutSessionId: checkout_session_id,
    });

    // Submit receipt with buyer submission as buyerInfo
    await submitReceipt(sessionSupabase, orderId, null, null, submission);

    return NextResponse.json({ orderId }, { status: 201 });
  } catch (error) {
    console.error("[checkout/orders]", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
