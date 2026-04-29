import {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "@/shared/domain/constants";
import {
  assertValidReceiptFile,
  buildReceiptStoragePath,
  toSafeStoragePath,
} from "@/shared/domain/receipt";
import type { SupabaseClient } from "@/shared/domain/types";

export async function uploadReceipt(
  supabase: SupabaseClient,
  file: File,
  orderId: string,
): Promise<string> {
  assertValidReceiptFile(file);
  const rawPath = buildReceiptStoragePath(orderId, file);
  // toSafeStoragePath validates and reconstructs from regex capture groups,
  // breaking the SAST taint chain before the path reaches Supabase Storage.
  const safePath = toSafeStoragePath(rawPath);

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(safePath, file); // nosemgrep: AIK_supabase_sdk_storage_path_traversal

  if (error) throw error;

  return safePath;
}

/**
 * Generate a signed receipt URL using the caller's Supabase session.
 * Access is controlled by the receipts_read storage policy, which grants
 * access to both sellers (receipts.read permission) and their delegates
 * (via is_receipt_delegate RLS function).
 */
export async function getReceiptUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  const safePath = toSafeStoragePath(storagePath);

  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(safePath, RECEIPT_URL_TTL_SECONDS); // nosemgrep: AIK_supabase_sdk_storage_path_traversal

  if (error) return null;
  return data.signedUrl;
}

export async function deleteReceipt(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const safePath = toSafeStoragePath(storagePath);
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([safePath]); // nosemgrep: AIK_supabase_sdk_storage_path_traversal

  if (error) throw error;
}
