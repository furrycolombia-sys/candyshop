import {
  ACCEPTED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
} from "@/shared/domain/constants";

const DEFAULT_RECEIPT_EXTENSION = ".bin";
const FALLBACK_RECEIPT_NAME = "receipt";
const MAX_RECEIPT_FILENAME_LENGTH = 64;

const RECEIPT_EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

function normalizeReceiptMimeType(file: File): string {
  const mimeType = file.type.toLowerCase();
  if (mimeType in RECEIPT_EXTENSION_BY_MIME) return mimeType;

  const filename = file.name.toLowerCase();
  if (filename.endsWith(".jpeg") || filename.endsWith(".jpg")) {
    return "image/jpeg";
  }
  if (filename.endsWith(".png")) {
    return "image/png";
  }
  if (filename.endsWith(".webp")) {
    return "image/webp";
  }
  return "";
}

export function validateReceiptFile(file: File): {
  isValid: boolean;
  reason: "too_large" | "invalid_type" | null;
} {
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return { isValid: false, reason: "too_large" };
  }

  const mimeType = normalizeReceiptMimeType(file);
  if (
    !mimeType ||
    !ACCEPTED_RECEIPT_MIME_TYPES.includes(
      mimeType as (typeof ACCEPTED_RECEIPT_MIME_TYPES)[number],
    )
  ) {
    return { isValid: false, reason: "invalid_type" };
  }

  return { isValid: true, reason: null };
}

export function assertValidReceiptFile(file: File): void {
  const validation = validateReceiptFile(file);
  if (!validation.isValid) {
    throw new Error(
      validation.reason === "too_large"
        ? "receipt_too_large"
        : "invalid_receipt_type",
    );
  }
}

export function sanitizeReceiptFilename(file: File): string {
  const mimeType = normalizeReceiptMimeType(file);
  const extension =
    RECEIPT_EXTENSION_BY_MIME[
      mimeType as keyof typeof RECEIPT_EXTENSION_BY_MIME
    ] ?? DEFAULT_RECEIPT_EXTENSION;
  const extensionIndex = file.name.lastIndexOf(".");
  const baseName =
    extensionIndex > 0 ? file.name.slice(0, extensionIndex) : file.name;
  const lowered = baseName.toLowerCase();
  let normalizedBase = "";

  for (const character of lowered) {
    const isAlphaNumeric =
      (character >= "a" && character <= "z") ||
      (character >= "0" && character <= "9");

    if (isAlphaNumeric) {
      normalizedBase += character;
      continue;
    }

    if (!normalizedBase.endsWith("-")) {
      normalizedBase += "-";
    }
  }

  normalizedBase = normalizedBase.slice(0, MAX_RECEIPT_FILENAME_LENGTH);

  while (normalizedBase.startsWith("-")) {
    normalizedBase = normalizedBase.slice(1);
  }

  while (normalizedBase.endsWith("-")) {
    normalizedBase = normalizedBase.slice(0, -1);
  }

  return `${normalizedBase || FALLBACK_RECEIPT_NAME}${extension}`;
}

export function buildReceiptStoragePath(orderId: string, file: File): string {
  return `${orderId}/${sanitizeReceiptFilename(file)}`;
}

export function getSafeReceiptHref(receiptUrl: string | null): string | null {
  if (!receiptUrl) return null;

  try {
    const parsed = new URL(receiptUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
