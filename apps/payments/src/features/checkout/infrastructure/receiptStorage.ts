import {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "@/shared/domain/constants";
import {
  assertValidReceiptFile,
  buildReceiptStoragePath,
} from "@/shared/domain/receipt";
import type { SupabaseClient } from "@/shared/domain/types";

/**
 * Upload a receipt image to Supabase Storage.
 * Returns the storage path (not a public URL).
 */
export async function uploadReceipt(
  supabase: SupabaseClient,
  file: File,
  orderId: string,
): Promise<string> {
  assertValidReceiptFile(file);
  const storagePath = buildReceiptStoragePath(orderId, file);

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file, { upsert: true });

  if (error) throw error;

  return storagePath;
}

/**
 * Resolve a stored receipt path into a temporary signed URL safe for rendering.
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

/**
 * Delete a receipt from Supabase Storage.
 */
export async function deleteReceipt(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}
