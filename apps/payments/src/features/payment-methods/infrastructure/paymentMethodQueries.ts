/* eslint-disable @typescript-eslint/no-explicit-any -- tables not in generated types yet */
import type {
  PaymentMethodType,
  SellerPaymentMethod,
  SellerPaymentMethodFormValues,
} from "@/features/payment-methods/domain/types";
import type { SupabaseClient as SupabaseDB } from "@/shared/domain/types";

const NOT_AUTHENTICATED = "Not authenticated";

/** Fetch all active payment method types from the catalog */
export async function fetchPaymentMethodTypes(
  supabase: SupabaseDB,
): Promise<PaymentMethodType[]> {
  const { data, error } = await (supabase.from as any)("payment_method_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as PaymentMethodType[];
}

/** Fetch seller's configured payment methods */
export async function fetchSellerPaymentMethods(
  supabase: SupabaseDB,
): Promise<SellerPaymentMethod[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(NOT_AUTHENTICATED);

  const { data, error } = await (supabase.from as any)("seller_payment_methods")
    .select("*")
    .eq("seller_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as SellerPaymentMethod[];
}

/** Get the next sort_order value for seller payment methods */
async function getNextSortOrder(
  supabase: SupabaseDB,
  userId: string,
): Promise<number> {
  const { data } = await (supabase.from as any)("seller_payment_methods")
    .select("sort_order")
    .eq("seller_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  return ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

/** Insert a new seller payment method */
export async function insertSellerPaymentMethod(
  supabase: SupabaseDB,
  values: SellerPaymentMethodFormValues,
): Promise<SellerPaymentMethod> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(NOT_AUTHENTICATED);

  const sortOrder = await getNextSortOrder(supabase, user.id);

  const { data, error } = await (supabase.from as any)("seller_payment_methods")
    .insert({
      seller_id: user.id,
      type_id: values.type_id,
      account_details_en: values.account_details_en || null,
      account_details_es: values.account_details_es || null,
      seller_note_en: values.seller_note_en || null,
      seller_note_es: values.seller_note_es || null,
      is_active: values.is_active,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SellerPaymentMethod;
}

/** Update an existing seller payment method */
export async function updateSellerPaymentMethod(
  supabase: SupabaseDB,
  id: string,
  values: SellerPaymentMethodFormValues,
): Promise<SellerPaymentMethod> {
  const { data, error } = await (supabase.from as any)("seller_payment_methods")
    .update({
      type_id: values.type_id,
      account_details_en: values.account_details_en || null,
      account_details_es: values.account_details_es || null,
      seller_note_en: values.seller_note_en || null,
      seller_note_es: values.seller_note_es || null,
      is_active: values.is_active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as SellerPaymentMethod;
}

/** Delete a seller payment method */
export async function deleteSellerPaymentMethod(
  supabase: SupabaseDB,
  id: string,
): Promise<void> {
  const { error } = await (supabase.from as any)("seller_payment_methods")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Toggle active state on a seller payment method */
export async function toggleSellerPaymentMethodActive(
  supabase: SupabaseDB,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await (supabase.from as any)("seller_payment_methods")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}
