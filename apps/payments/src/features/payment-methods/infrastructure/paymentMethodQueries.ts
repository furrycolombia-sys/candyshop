/* eslint-disable i18next/no-literal-string -- SQL table/column identifiers and internal error messages */
/* eslint-disable @typescript-eslint/no-explicit-any -- tables not in generated types yet */
import type {
  SellerPaymentMethod,
  SellerPaymentMethodFormValues,
} from "@/features/payment-methods/domain/types";
import type { SupabaseClient as SupabaseDB } from "@/shared/domain/types";

const SELLER_PAYMENT_METHODS_TABLE = "seller_payment_methods";
const ERR_NOT_AUTHENTICATED = "Not authenticated";

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

// ─── Legacy functions (kept for backward compat) ──────────────────────────────

/** @deprecated Use fetchPaymentMethods instead */
export async function fetchSellerPaymentMethods(
  supabase: SupabaseDB,
): Promise<SellerPaymentMethod[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(ERR_NOT_AUTHENTICATED);

  return fetchPaymentMethods(supabase, user.id);
}

/** @deprecated Use createPaymentMethod instead */
export async function insertSellerPaymentMethod(
  supabase: SupabaseDB,
  values: SellerPaymentMethodFormValues,
): Promise<SellerPaymentMethod> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(ERR_NOT_AUTHENTICATED);

  const { data: existing } = await (supabase.from as any)(
    SELLER_PAYMENT_METHODS_TABLE,
  )
    .select("sort_order")
    .eq("seller_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder =
    ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await (supabase.from as any)(
    SELLER_PAYMENT_METHODS_TABLE,
  )
    .insert({
      seller_id: user.id,
      name_en: values.account_details_en || "Payment Method",
      name_es: values.account_details_es || null,
      display_blocks: [],
      form_fields: [],
      is_active: values.is_active,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SellerPaymentMethod;
}

/** @deprecated Use updatePaymentMethod instead */
export async function updateSellerPaymentMethod(
  supabase: SupabaseDB,
  id: string,
  values: SellerPaymentMethodFormValues,
): Promise<SellerPaymentMethod> {
  return updatePaymentMethod(supabase, id, {
    is_active: values.is_active,
  });
}

/** @deprecated Use deletePaymentMethod instead */
export async function deleteSellerPaymentMethod(
  supabase: SupabaseDB,
  id: string,
): Promise<void> {
  return deletePaymentMethod(supabase, id);
}

/** @deprecated Use updatePaymentMethod instead */
export async function toggleSellerPaymentMethodActive(
  supabase: SupabaseDB,
  id: string,
  isActive: boolean,
): Promise<void> {
  await updatePaymentMethod(supabase, id, { is_active: isActive });
}
