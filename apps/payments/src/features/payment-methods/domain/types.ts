/** Admin-defined payment method type from the catalog */
export interface PaymentMethodType {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
  is_active: boolean;
}

/** Seller's configured payment method (references a type) */
export interface SellerPaymentMethod {
  id: string;
  seller_id: string;
  type_id: string;
  account_details_en: string | null;
  account_details_es: string | null;
  seller_note_en: string | null;
  seller_note_es: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Form values for creating/editing a seller payment method */
export interface SellerPaymentMethodFormValues {
  type_id: string;
  account_details_en: string;
  account_details_es: string;
  seller_note_en: string;
  seller_note_es: string;
  is_active: boolean;
}
