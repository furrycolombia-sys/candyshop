import {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "@/shared/domain/constants";
import {
  assertValidReceiptFile,
  buildReceiptStoragePath,
} from "@/shared/domain/receipt";
import type { SupabaseClient } from "@/shared/domain/types";

export async function uploadReceipt(
  supabase: SupabaseClient,
  file: File,
  orderId: string,
): Promise<string> {
  assertValidReceiptFile(file);
  const storagePath = buildReceiptStoragePath(orderId, file);

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file);

  if (error) throw error;

  return storagePath;
}

/**
 * Generate a signed receipt URL using the caller's Supabase session.
 * Access is controlled by the receipts_read storage policy, which grants
 * access to both sellers (receipts.read permission) and their delegates
 * (via is_order_delegate RLS function).
 */
export async function getReceiptUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, RECEIPT_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}

export async function deleteReceipt(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}
