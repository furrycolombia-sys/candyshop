/* eslint-disable i18next/no-literal-string -- server file: Supabase API paths and bucket names are SQL/REST identifiers, not user-facing text */
import {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "shared/constants/receipts";
import { toSafeReceiptPath } from "shared/utils/receiptPath";

// Browser-accessible host. Must be used when building the URL returned to
// the client; SUPABASE_URL_INTERNAL is only reachable from inside Docker.
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Prefer the internal URL when available so the server-to-Supabase signing
// hop stays fast inside Docker networking.
const SIGNING_SUPABASE_URL =
  process.env["SUPABASE_URL_INTERNAL"] || PUBLIC_SUPABASE_URL;

// Read service role at module load (matches the other URL constants).
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SignedUrlResponse {
  signedURL?: string;
}

/**
 * Convert a Supabase Storage path (e.g. `"orderId/receipt.png"`) into a
 * browser-accessible signed URL using the service role.
 *
 * Returns `null` when the path is missing, unsafe, the service role is not
 * configured, or the storage API rejects the request. Admins viewing reports
 * may need access to receipts from any seller, so this bypasses RLS by design.
 */
export async function signReceiptPath(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  if (!SERVICE_ROLE_KEY || !SIGNING_SUPABASE_URL || !PUBLIC_SUPABASE_URL) {
    return null;
  }

  const safePath = toSafeReceiptPath(storagePath);
  if (!safePath) return null;

  try {
    const response = await fetch(
      `${SIGNING_SUPABASE_URL}/storage/v1/object/sign/${RECEIPTS_BUCKET}/${safePath}`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: RECEIPT_URL_TTL_SECONDS }),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as SignedUrlResponse;
    if (!body.signedURL) return null;

    // signedURL is a relative path like "/object/sign/receipts/<path>?token=...".
    // Return the URL with the public host so the browser can resolve it.
    return `${PUBLIC_SUPABASE_URL}/storage/v1${body.signedURL}`;
  } catch {
    return null;
  }
}
