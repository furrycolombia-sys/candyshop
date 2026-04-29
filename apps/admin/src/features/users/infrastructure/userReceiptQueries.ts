/* eslint-disable i18next/no-literal-string -- Supabase table/column identifiers are internal literals */
import type { ReceiptBackup } from "@/features/users/application/utils/exportCsv";
import type { SupabaseClient } from "@/shared/domain/types";

interface OrderReceiptRow {
  id: string;
  user_id: string;
  receipt_url: string | null;
}

const RECEIPT_ENCODING_ERROR = "Failed to encode receipt";
const DATA_URL_SPLIT_LIMIT = 2;

function toBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener("error", () => {
      reject(new Error(RECEIPT_ENCODING_ERROR));
    });
    fileReader.addEventListener("load", () => {
      if (typeof fileReader.result !== "string") {
        reject(new Error(RECEIPT_ENCODING_ERROR));
        return;
      }
      const base64 =
        fileReader.result.split(",", DATA_URL_SPLIT_LIMIT)[1] ?? "";
      resolve(base64);
    });
    fileReader.readAsDataURL(new Blob([buffer]));
  });
}

// Whitelist for receipt storage paths: exactly one slash, both segments alphanumeric+hyphen+underscore,
// second segment has a known image extension. Capture groups used to reconstruct below.
const SAFE_RECEIPT_PATH =
  /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\.(jpg|png|webp)$/;

function filenameFromPath(storagePath: string): string {
  const parts = storagePath.split("/");
  return parts.at(-1) || storagePath;
}

export async function fetchUserReceipts(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<ReceiptBackup[]> {
  const { data: receiptRowsData } = await supabase
    .from("orders")
    .select("id, user_id, receipt_url")
    .in("user_id", userIds)
    .not("receipt_url", "is", null);

  const receiptRows = (receiptRowsData ?? []) as unknown as OrderReceiptRow[];

  const results = await Promise.all(
    receiptRows
      .filter((row) => !!row.receipt_url)
      .map(async (row) => {
        const rawPath = row.receipt_url as string;
        const pathMatch = SAFE_RECEIPT_PATH.exec(rawPath);
        if (!pathMatch) return null;
        // Reconstruct from capture groups to break SAST taint chain
        const safePath = `${pathMatch[1]}/${pathMatch[2]}.${pathMatch[3]}`;
        const { data, error } = await supabase.storage
          .from("receipts")
          .download(safePath); // nosemgrep: AIK_supabase_sdk_storage_path_traversal

        if (error || !data) return null;

        const fileBuffer = await data.arrayBuffer();
        return {
          userId: row.user_id,
          orderId: row.id,
          storagePath: safePath,
          fileName: filenameFromPath(safePath),
          mimeType: data.type || "application/octet-stream",
          byteSize: data.size,
          fileBase64: await toBase64(fileBuffer),
        } satisfies ReceiptBackup;
      }),
  );

  return results.filter((r): r is ReceiptBackup => r !== null);
}
