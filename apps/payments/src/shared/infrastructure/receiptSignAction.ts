"use server";

/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase storage paths and API keys */
import {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "@/shared/domain/constants";

/**
 * Generate a signed receipt URL on the server using the service role key.
 * Running server-side guarantees access to SUPABASE_SERVICE_ROLE_KEY and
 * bypasses RLS, so both owning sellers and their delegates can fetch the URL.
 * Authorization is enforced upstream at the orders query layer.
 */
export async function signReceiptUrl(
  storagePath: string,
): Promise<string | null> {
  const internalUrl =
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // signedURL is a relative path. Local Supabase CLI omits the /storage/v1
    // prefix that Supabase Cloud includes — normalise before prepending.
    const signedPath = data.signedURL.startsWith("/storage/v1")
      ? data.signedURL
      : `/storage/v1${data.signedURL}`;

    return `${publicUrl}${signedPath}`;
  } catch {
    return null;
  }
}
