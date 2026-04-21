// ─── Display Block Types ──────────────────────────────────────────────────────

export type DisplayBlockType = "text" | "image" | "video" | "link" | "url";

interface DisplayBlockBase {
  id: string;
  type: DisplayBlockType;
}

export interface TextBlock extends DisplayBlockBase {
  type: "text";
  content_en: string;
  content_es?: string;
}

export interface ImageBlock extends DisplayBlockBase {
  type: "image";
  url: string;
  alt_en?: string;
  alt_es?: string;
}

export interface VideoBlock extends DisplayBlockBase {
  type: "video";
  url: string; // stored as embed URL (auto-converted from watch/short URLs)
}

export interface LinkBlock extends DisplayBlockBase {
  type: "link";
  url: string;
  label_en: string;
  label_es?: string;
}

export interface UrlBlock extends DisplayBlockBase {
  type: "url";
  url: string;
  label_en?: string;
  label_es?: string;
}

export type DisplayBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | LinkBlock
  | UrlBlock;

// ─── Form Field Types ─────────────────────────────────────────────────────────

export type FormFieldType = "text" | "email" | "number" | "file" | "textarea";

export interface FormField {
  id: string;
  type: FormFieldType;
  label_en: string;
  label_es?: string;
  placeholder_en?: string;
  placeholder_es?: string;
  required: boolean;
}

// ─── Seller Payment Method ────────────────────────────────────────────────────

export interface SellerPaymentMethod {
  id: string;
  seller_id: string;
  name_en: string;
  name_es: string | null;
  display_blocks: DisplayBlock[];
  form_fields: FormField[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Buyer Submission ─────────────────────────────────────────────────────────

/** Key = FormField.id, value = string (file fields store the Supabase Storage URL) */
export type BuyerSubmission = Record<string, string>;
