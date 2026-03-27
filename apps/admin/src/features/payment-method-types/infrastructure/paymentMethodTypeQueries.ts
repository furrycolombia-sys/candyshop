import type { createBrowserSupabaseClient } from "api/supabase";

import type {
  PaymentMethodType,
  PaymentMethodTypeFormValues,
} from "@/features/payment-method-types/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const TABLE = "payment_method_types" as any;

/** Fetch all payment method types ordered by sort_order */
export async function fetchPaymentMethodTypes(
  supabase: SupabaseClient,
): Promise<PaymentMethodType[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as unknown as PaymentMethodType[];
}

/** Create a new payment method type */
export async function insertPaymentMethodType(
  supabase: SupabaseClient,
  values: PaymentMethodTypeFormValues,
): Promise<PaymentMethodType> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as PaymentMethodType;
}

/** Update an existing payment method type */
export async function updatePaymentMethodType(
  supabase: SupabaseClient,
  id: string,
  values: Partial<PaymentMethodTypeFormValues>,
): Promise<PaymentMethodType> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as PaymentMethodType;
}

/** Delete a payment method type by ID */
export async function deletePaymentMethodType(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;
}

/** Toggle the is_active field on a payment method type */
export async function togglePaymentMethodTypeActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}
