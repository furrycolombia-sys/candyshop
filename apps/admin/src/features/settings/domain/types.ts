export interface PaymentSettings {
  timeout_awaiting_payment_hours: number;
  timeout_pending_verification_hours: number;
  timeout_evidence_requested_hours: number;
}

export const SETTING_KEYS: (keyof PaymentSettings)[] = [
  "timeout_awaiting_payment_hours",
  "timeout_pending_verification_hours",
  "timeout_evidence_requested_hours",
];
