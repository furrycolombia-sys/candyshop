/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase storage paths and API keys */
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
 * Generate a signed receipt URL using the service role key so that both
 * sellers and delegates can access receipts. RLS is bypassed here because
 * authorization is already enforced at the orders query layer — only callers
 * that already retrieved the order row (and therefore passed orders RLS) can
 * reach this function with a non-null storagePath.
 */
export async function getReceiptUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;

  // Dynamic key access prevents Turbopack from inlining at build time
  const internalUrl =
    process.env["SUPABASE_URL_INTERNAL"] ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!internalUrl || !publicUrl || !serviceKey) return null;

  try {
    const response = await fetch(
      `${internalUrl}/storage/v1/object/sign/${RECEIPTS_BUCKET}/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: RECEIPT_URL_TTL_SECONDS }),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { signedURL?: string };
    if (!data.signedURL) return null;

    // signedURL is a relative path — prepend the public URL so the browser can reach it
    return `${publicUrl}${data.signedURL}`;
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
