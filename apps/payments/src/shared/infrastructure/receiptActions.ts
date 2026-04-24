"use server";

/* eslint-disable i18next/no-literal-string -- server action: Supabase env var names and storage paths are not user-facing */

import { RECEIPTS_BUCKET } from "@/shared/domain/constants";
import {
  assertValidReceiptFile,
  sanitizeReceiptFilename,
} from "@/shared/domain/receipt";
import { adminFetchJson } from "@/shared/infrastructure/adminRestClient";

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
    await response.text();
    throw new Error(`Receipt upload failed (${String(response.status)})`);
  }
}

/**
 * Upload a receipt during checkout.
 * Uses checkoutSessionId as the storage path prefix so the
 * `is_receipt_delegate` storage policy can match receipts by session.
 */
export async function uploadCheckoutReceipt(
  checkoutSessionId: string,
  file: File,
): Promise<string> {
  assertValidReceiptFile(file);
  const filename = `${crypto.randomUUID()}-${sanitizeReceiptFilename(file)}`;
  const storagePath = `${checkoutSessionId}/${filename}`;
  await uploadToStorage(storagePath, file);
  return storagePath;
}

/**
 * Upload a receipt when resubmitting evidence for an existing order.
 * Looks up the order's checkoutSessionId so the receipt is stored under
 * the checkout session prefix, keeping `is_receipt_delegate` working.
 */
export async function uploadOrderReceipt(
  orderId: string,
  file: File,
): Promise<string> {
  const rows = await adminFetchJson<
    Array<{ checkout_session_id: string | null }>
  >(`orders?id=eq.${encodeURIComponent(orderId)}&select=checkout_session_id`);

  const checkoutSessionId = rows[0]?.checkout_session_id;
  if (!checkoutSessionId) {
    throw new Error("Order not found or missing checkout_session_id");
  }

  return uploadCheckoutReceipt(checkoutSessionId, file);
}
