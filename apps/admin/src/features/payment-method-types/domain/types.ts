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
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodTypeFormValues {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  icon: string;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
  is_active: boolean;
}
