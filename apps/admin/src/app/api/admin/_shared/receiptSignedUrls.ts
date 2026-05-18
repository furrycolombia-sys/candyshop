/* eslint-disable i18next/no-literal-string -- server file: Supabase API paths and bucket names are SQL/REST identifiers, not user-facing text */

const RECEIPTS_BUCKET = "receipts";
const SECONDS_PER_HOUR = 3600;
const SIGNED_URL_TTL_SECONDS = SECONDS_PER_HOUR;

// Browser-accessible host. Must be used when building the URL returned to
// the client; SUPABASE_URL_INTERNAL is only reachable from inside Docker.
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Prefer the internal URL when available so the server-to-Supabase signing
// hop stays fast inside Docker networking.
const SIGNING_SUPABASE_URL =
  process.env["SUPABASE_URL_INTERNAL"] || PUBLIC_SUPABASE_URL;

// Whitelist for receipt storage paths used across the project:
// exactly one slash, both segments alphanumeric + hyphen + underscore,
// second segment has a known image extension. Capture groups reconstruct
// the path to break SAST taint chains.
const SAFE_RECEIPT_PATH =
  /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\.(jpg|png|webp)$/;

function toSafeStoragePath(storagePath: string): string | null {
  const match = SAFE_RECEIPT_PATH.exec(storagePath);
  if (!match) return null;
  return `${match[1]}/${match[2]}.${match[3]}`;
}

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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !SIGNING_SUPABASE_URL || !PUBLIC_SUPABASE_URL) {
    return null;
  }

  const safePath = toSafeStoragePath(storagePath);
  if (!safePath) return null;

  try {
    const response = await fetch(
      `${SIGNING_SUPABASE_URL}/storage/v1/object/sign/${RECEIPTS_BUCKET}/${safePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
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
