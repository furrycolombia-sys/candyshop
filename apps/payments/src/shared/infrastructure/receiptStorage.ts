import { RECEIPTS_BUCKET } from "@/shared/domain/constants";
import {
  assertValidReceiptFile,
  buildReceiptStoragePath,
} from "@/shared/domain/receipt";
import type { SupabaseClient } from "@/shared/domain/types";
import { signReceiptUrl } from "@/shared/infrastructure/receiptSignAction";

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
 * Generate a signed receipt URL. Delegates to a Server Action so the service
 * role key is never exposed to the browser, regardless of whether the caller
 * is a Client Component hook or a Server Component.
 */
export async function getReceiptUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  try {
    return await signReceiptUrl(storagePath);
  } catch {
    return null;
  }
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
