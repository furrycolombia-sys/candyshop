import type { BuyerSubmission, FormField } from "./paymentMethodTypes";

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 10 MB in bytes
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

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
