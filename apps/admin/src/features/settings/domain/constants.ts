export const SETTINGS_QUERY_KEY = "payment-settings";
export const SETTINGS_STALE_TIME_MS = 30_000;

export const DEFAULT_SETTINGS = {
  timeout_awaiting_payment_hours: 48,
  timeout_pending_verification_hours: 72,
  timeout_evidence_requested_hours: 24,
};
