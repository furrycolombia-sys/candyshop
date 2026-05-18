/**
 * Whitelist regex for receipt storage paths used everywhere receipts are
 * accessed. Format: `<segment>/<segment>.<ext>` where each segment is
 * alphanumeric + hyphen + underscore and ext is a supported image format.
 *
 * Capture groups exist so consumers can reconstruct the path from `match[]`
 * — that pattern breaks SAST taint chains on the original `storagePath`.
 */
export const SAFE_RECEIPT_PATH =
  /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\.(jpg|png|webp)$/;

/**
 * Validate a receipt storage path. Returns the reconstructed-from-capture
 * path on success (untainted from a SAST tool's perspective) or `null` on
 * any input that doesn't match SAFE_RECEIPT_PATH.
 *
 * Use this when you want a null-safe check (e.g., a server route deciding
 * whether to attempt a signed-URL exchange).
 */
export function toSafeReceiptPath(storagePath: string): string | null {
  const match = SAFE_RECEIPT_PATH.exec(storagePath);
  if (!match) return null;
  return `${match[1]}/${match[2]}.${match[3]}`;
}

/**
 * Same validation as `toSafeReceiptPath`, but throws on invalid input
 * instead of returning null. Use this when a caller expects already-valid
 * paths and an invalid one indicates a bug (e.g., uploadReceipt's output
 * being re-validated before passing to storage).
 */
export function assertSafeReceiptPath(storagePath: string): string {
  const safe = toSafeReceiptPath(storagePath);
  if (!safe) throw new Error("Invalid storage path: path traversal detected");
  return safe;
}
