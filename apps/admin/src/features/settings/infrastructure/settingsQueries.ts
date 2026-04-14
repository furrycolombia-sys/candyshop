import type { createBrowserSupabaseClient } from "api/supabase";

import { DEFAULT_SETTINGS } from "@/features/settings/domain/constants";
import type { PaymentSettings } from "@/features/settings/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const TABLE = "payment_settings" as any;

/** Fetch all payment settings and parse into a typed object */
export async function fetchPaymentSettings(
  supabase: SupabaseClient,
): Promise<PaymentSettings> {
  const { data, error } = await supabase.from(TABLE).select("*");

  if (error) throw error;

  const rows = (data ?? []) as unknown as { key: string; value: string }[];
  const record: Record<string, string> = {};
  for (const row of rows) {
    record[row.key] = row.value;
  }

  return {
    timeout_awaiting_payment_hours:
      Number(record.timeout_awaiting_payment_hours) ||
      DEFAULT_SETTINGS.timeout_awaiting_payment_hours,
    timeout_pending_verification_hours:
      Number(record.timeout_pending_verification_hours) ||
      DEFAULT_SETTINGS.timeout_pending_verification_hours,
    timeout_evidence_requested_hours:
      Number(record.timeout_evidence_requested_hours) ||
      DEFAULT_SETTINGS.timeout_evidence_requested_hours,
  };
}

/** Upsert a single payment setting by key */
export async function updatePaymentSetting(
  supabase: SupabaseClient,
  key: string,
  value: number,
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
