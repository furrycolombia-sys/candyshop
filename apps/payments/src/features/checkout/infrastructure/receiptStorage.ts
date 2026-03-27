import type { createBrowserSupabaseClient } from "api/supabase";

import { RECEIPTS_BUCKET } from "@/features/checkout/domain/constants";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

/**
 * Upload a receipt image to Supabase Storage.
 * Returns the storage path (not a public URL).
 */
export async function uploadReceipt(
  supabase: SupabaseClient,
  file: File,
  orderId: string,
): Promise<string> {
  const storagePath = `${orderId}/${file.name}`;

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file, { upsert: true });

  if (error) throw error;

  return storagePath;
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
