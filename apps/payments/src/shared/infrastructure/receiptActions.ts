"use server";

/* eslint-disable i18next/no-literal-string -- server action: Supabase env var names and storage paths are not user-facing */

import { getCurrentUserId } from "api/supabase";
import { createServerSupabaseClient } from "api/supabase/server";

import { RECEIPTS_BUCKET } from "@/shared/domain/constants";
import {
  sanitizeReceiptFilename,
  validateReceiptFile,
} from "@/shared/domain/receipt";
import { adminFetchJson } from "@/shared/infrastructure/adminRestClient";

type ReceiptUploadResult =
  | { ok: true; path: string }
  | {
      ok: false;
      code: "receipt_too_large" | "invalid_receipt_type" | "upload_failed";
    };

// Dynamic key access prevents Turbopack from inlining at build time.
const _internalUrlKey = "SUPABASE_URL_INTERNAL";

function getStorageBaseUrl(): string {
  const url =
    (globalThis.window === undefined
      ? process.env[_internalUrlKey]
      : undefined) || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Supabase URL is not configured");
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

async function uploadToStorage(storagePath: string, file: File): Promise<void> {
  const url = `${getStorageBaseUrl()}/storage/v1/object/${RECEIPTS_BUCKET}/${storagePath}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: await file.arrayBuffer(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[receiptActions] upload failed status=${String(response.status)} path=${storagePath} body=${body}`,
    );
    throw new Error(`Receipt upload failed (${String(response.status)})`);
  }
}

/**
 * The signed-in user, or null.
 *
 * A server action is a public POST endpoint: Next.js routes it by a generated
 * id and authenticates nothing. These two upload with the service role key,
 * which bypasses the storage policies, so without this anybody who could reach
 * the app could write into the receipts bucket. The checkout route these
 * actions belong to already demands a session plus orders.create and
 * receipts.create; the upload beside it demanded nothing.
 *
 * @returns the caller's user id, or null when there is no session.
 */
async function getCallerId(): Promise<string | null> {
  try {
    return await getCurrentUserId(await createServerSupabaseClient());
  } catch (error) {
    console.error(
      "[receiptActions] could not resolve the caller:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Upload a receipt during checkout.
 *
 * Requires a session. Returns a typed result instead of throwing so callers
 * can map error codes to user-facing messages. (Next.js server action errors
 * are replaced with a generic message in production, hiding the real cause
 * from users.) An unauthenticated call comes back as `upload_failed` rather
 * than a code of its own, so a caller learns nothing about what exists.
 */
export async function uploadCheckoutReceipt(
  checkoutSessionId: string,
  file: File,
): Promise<ReceiptUploadResult> {
  // The session id is chosen by the client before any order exists, so there
  // is nothing to check it against yet; a session is the bar this can hold.
  if (!(await getCallerId())) {
    console.error("[receiptActions] uploadCheckoutReceipt: no session");
    return { ok: false, code: "upload_failed" };
  }

  const validation = validateReceiptFile(file);
  if (!validation.isValid) {
    return {
      ok: false,
      code:
        validation.reason === "too_large"
          ? "receipt_too_large"
          : "invalid_receipt_type",
    };
  }

  try {
    const filename = `${crypto.randomUUID()}-${sanitizeReceiptFilename(file)}`;
    const storagePath = `${checkoutSessionId}/${filename}`;
    await uploadToStorage(storagePath, file);
    return { ok: true, path: storagePath };
  } catch (error) {
    console.error(
      "[receiptActions] uploadCheckoutReceipt failed:",
      error instanceof Error ? error.message : String(error),
    );
    return { ok: false, code: "upload_failed" };
  }
}

/**
 * Upload a receipt when resubmitting evidence for an existing order.
 *
 * Looks up the order's checkoutSessionId so the receipt is stored under the
 * checkout session prefix, keeping `is_receipt_delegate` working -- and looks
 * it up **scoped to the caller**, so an order id alone no longer opens another
 * buyer's prefix for writing. An order that is not theirs is indistinguishable
 * from one that does not exist.
 */
export async function uploadOrderReceipt(
  orderId: string,
  file: File,
): Promise<ReceiptUploadResult> {
  const callerId = await getCallerId();
  if (!callerId) {
    console.error("[receiptActions] uploadOrderReceipt: no session");
    return { ok: false, code: "upload_failed" };
  }

  // Scoped to the caller's own order. This is the buyer resubmitting evidence
  // from their orders page; delegates read receipts through
  // is_receipt_delegate, they do not upload. Without the scope the order id
  // alone was enough to write into any order's prefix.
  const rows = await adminFetchJson<
    Array<{ checkout_session_id: string | null }>
  >(
    `orders?id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(callerId)}&select=checkout_session_id`,
  );

  const checkoutSessionId = rows[0]?.checkout_session_id;
  if (!checkoutSessionId) {
    console.error(
      `[receiptActions] order ${orderId} is not the caller's, or has no checkout_session_id`,
    );
    return { ok: false, code: "upload_failed" };
  }

  return uploadCheckoutReceipt(checkoutSessionId, file);
}
