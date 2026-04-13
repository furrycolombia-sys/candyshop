/**
 * Re-export receipt storage functions from the shared layer.
 *
 * These functions were promoted to `@/shared/infrastructure/receiptStorage`
 * because they are used across multiple features (checkout, orders, received-orders).
 * This re-export keeps internal checkout imports working unchanged.
 */
export {
  deleteReceipt,
  getReceiptUrl,
  uploadReceipt,
} from "@/shared/infrastructure/receiptStorage";
