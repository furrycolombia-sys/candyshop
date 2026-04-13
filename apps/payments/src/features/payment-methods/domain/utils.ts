/* eslint-disable i18next/no-literal-string -- internal validation error messages, not user-facing */
import { i18nField } from "shared";

import type {
  BuyerSubmission,
  DisplayBlock,
  DisplayBlockType,
  FormField,
  FormFieldType,
  PaymentMethodType,
} from "./types";

const VALID_BLOCK_TYPES: DisplayBlockType[] = [
  "text",
  "image",
  "video",
  "link",
  "url",
];
const VALID_FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "number",
  "file",
  "textarea",
];
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 10 MB in bytes
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── ID Assignment ────────────────────────────────────────────────────────────

/** Assign a stable UUID if the block has no id yet. Returns a new object. */
export function assignBlockId(
  block: Omit<DisplayBlock, "id"> & { id?: string },
): DisplayBlock {
  return { ...block, id: block.id || crypto.randomUUID() } as DisplayBlock;
}

/** Assign a stable UUID if the field has no id yet. Returns a new object. */
export function assignFieldId(
  field: Omit<FormField, "id"> & { id?: string },
): FormField {
  return { ...field, id: field.id || crypto.randomUUID() } as FormField;
}

// ─── Array Helpers ────────────────────────────────────────────────────────────

/** Remove the element with the given id. Returns a new array. */
export function removeById<T extends { id: string }>(
  array: T[],
  id: string,
): T[] {
  return array.filter((item) => item.id !== id);
}

/**
 * Reorder array so elements appear in the order specified by `newOrder` (array of ids).
 * Elements whose id is not in `newOrder` are appended at the end in their original order.
 * Returns a new array.
 */
export function reorderById<T extends { id: string }>(
  array: T[],
  newOrder: string[],
): T[] {
  const map = new Map(array.map((item) => [item.id, item]));
  const reordered: T[] = [];
  for (const id of newOrder) {
    const item = map.get(id);
    if (item) reordered.push(item);
  }
  // Append any items not mentioned in newOrder
  for (const item of array) {
    if (!newOrder.includes(item.id)) reordered.push(item);
  }
  return reordered;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Returns an error string if the name is empty/whitespace, otherwise null. */
export function validatePaymentMethodName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Payment method name is required.";
  }
  return null;
}

/** Returns an error string if the block is invalid, otherwise null. */
export function validateDisplayBlock(
  block: Partial<DisplayBlock> & { type?: string },
): string | null {
  if (
    !block.type ||
    !VALID_BLOCK_TYPES.includes(block.type as DisplayBlockType)
  ) {
    return `Invalid display block type: "${block.type}". Must be one of: ${VALID_BLOCK_TYPES.join(", ")}.`;
  }

  // Types that require a URL
  if (["image", "video", "link", "url"].includes(block.type)) {
    const url = (block as { url?: string }).url;
    if (!url || url.trim().length === 0) {
      return "URL is required for this block type.";
    }
  }

  return null;
}

/** Returns an error string if the field is invalid, otherwise null. */
export function validateFormField(
  field: Partial<FormField> & { type?: string },
): string | null {
  if (!field.type || !VALID_FIELD_TYPES.includes(field.type as FormFieldType)) {
    return `Invalid form field type: "${field.type}". Must be one of: ${VALID_FIELD_TYPES.join(", ")}.`;
  }

  if (!field.label_en || field.label_en.trim().length === 0) {
    return "Field label is required.";
  }

  return null;
}

/**
 * Returns an array of label_en values for required fields that are missing
 * or empty in the submission. Empty array means the submission is valid.
 */
export function validateBuyerSubmission(
  fields: FormField[],
  submission: BuyerSubmission,
): string[] {
  const missing: string[] = [];
  for (const field of fields) {
    if (field.required) {
      const value = submission[field.id];
      if (!value || value.trim().length === 0) {
        missing.push(field.label_en);
      }
    }
  }
  return missing;
}

/** Returns true if the file size is within the 10 MB limit. */
export function validateFileSize(bytes: number): boolean {
  return bytes <= MAX_FILE_BYTES;
}

// ─── Legacy helpers (kept for backward compat during migration) ───────────────

/** @deprecated Resolve the localized name for a payment method type */
export function getPaymentTypeName(
  types: PaymentMethodType[],
  typeId: string,
  locale: string,
): string {
  const type = types.find((pt) => pt.id === typeId);
  if (!type) return typeId;
  return i18nField(type, "name", locale) || typeId;
}
