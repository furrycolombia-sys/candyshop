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
 * The Supabase server client uses SUPABASE_URL_INTERNAL (e.g.
 * `host.docker.internal:64321`) when present, so any signed URL it returns
 * carries that internal host. Browsers can't resolve that — rewrite the
 * host to NEXT_PUBLIC_SUPABASE_URL so the URL is reachable client-side.
 */
function rewriteToPublicHost(signedUrl: string): string {
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicBase) return signedUrl;
  try {
    const url = new URL(signedUrl);
    const publicUrl = new URL(publicBase);
    // Rewrite hostname AND port (and protocol) — setting `host` alone can
    // leave the original port in place when the public URL has no explicit
    // port (e.g. https://supabase.example.com).
    url.protocol = publicUrl.protocol;
    url.hostname = publicUrl.hostname;
    url.port = publicUrl.port;
    return url.toString();
  } catch {
    return signedUrl;
  }
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
  return rewriteToPublicHost(data.signedUrl);
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
