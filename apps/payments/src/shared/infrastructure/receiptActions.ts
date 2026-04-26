"use server";

/* eslint-disable i18next/no-literal-string -- server action: Supabase env var names and storage paths are not user-facing */

import { RECEIPTS_BUCKET } from "@/shared/domain/constants";
import {
  sanitizeReceiptFilename,
  validateReceiptFile,
} from "@/shared/domain/receipt";
import { adminFetchJson } from "@/shared/infrastructure/adminRestClient";

export type ReceiptUploadResult =
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
      : undefined) ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
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
 * Upload a receipt during checkout.
 * Returns a typed result instead of throwing so callers can map error codes
 * to user-facing messages. (Next.js server action errors are replaced with a
 * generic message in production, hiding the real cause from users.)
 */
export async function uploadCheckoutReceipt(
  checkoutSessionId: string,
  file: File,
): Promise<ReceiptUploadResult> {
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
 * Looks up the order's checkoutSessionId so the receipt is stored under
 * the checkout session prefix, keeping `is_receipt_delegate` working.
 */
export async function uploadOrderReceipt(
  orderId: string,
  file: File,
): Promise<ReceiptUploadResult> {
  const rows = await adminFetchJson<
    Array<{ checkout_session_id: string | null }>
  >(`orders?id=eq.${encodeURIComponent(orderId)}&select=checkout_session_id`);

  const checkoutSessionId = rows[0]?.checkout_session_id;
  if (!checkoutSessionId) {
    console.error(
      `[receiptActions] order ${orderId} missing checkout_session_id`,
    );
    return { ok: false, code: "upload_failed" };
  }

  return uploadCheckoutReceipt(checkoutSessionId, file);
}
