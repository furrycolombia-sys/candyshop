/* eslint-disable @typescript-eslint/no-explicit-any -- tables not in generated types yet */
import type { SellerPaymentMethod } from "@/features/payment-methods/domain/types";
import type { SupabaseClient as SupabaseDB } from "@/shared/domain/types";

const SELLER_PAYMENT_METHODS_TABLE = "seller_payment_methods";

/** Fetch all payment methods for a seller, ordered by sort_order */
export async function fetchPaymentMethods(
  supabase: SupabaseDB,
  sellerId: string,
): Promise<SellerPaymentMethod[]> {
  const { data, error } = await (supabase.from as any)(
    SELLER_PAYMENT_METHODS_TABLE,
  )
    .select("*")
    .eq("seller_id", sellerId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SellerPaymentMethod[];
}

/** Insert a new payment method with empty JSONB arrays */
export async function createPaymentMethod(
  supabase: SupabaseDB,
  sellerId: string,
  nameEn: string,
  nameEs?: string,
): Promise<SellerPaymentMethod> {
  const { data, error } = await (supabase.from as any)(
    SELLER_PAYMENT_METHODS_TABLE,
  )
    .insert({
      seller_id: sellerId,
      name_en: nameEn,
      name_es: nameEs ?? null,
      display_blocks: [],
      form_fields: [],
      is_active: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SellerPaymentMethod;
}

/** Update any subset of fields on a payment method */
export async function updatePaymentMethod(
  supabase: SupabaseDB,
  id: string,
  patch: Partial<
    Pick<
      SellerPaymentMethod,
      | "name_en"
      | "name_es"
      | "display_blocks"
      | "form_fields"
      | "is_active"
      | "sort_order"
    >
  >,
): Promise<SellerPaymentMethod> {
  const { data, error } = await (supabase.from as any)(
    SELLER_PAYMENT_METHODS_TABLE,
  )
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as SellerPaymentMethod;
}

/** Delete a payment method by id */
export async function deletePaymentMethod(
  supabase: SupabaseDB,
  id: string,
): Promise<void> {
  const { error } = await (supabase.from as any)(SELLER_PAYMENT_METHODS_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
