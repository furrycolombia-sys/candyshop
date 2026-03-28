import { describe, it, expect, vi } from "vitest";

import { fetchPaymentSettings, updatePaymentSetting } from "./settingsQueries";

function createMockSupabase(
  resolvedData: unknown,
  resolvedError: unknown = null,
) {
  const result = { data: resolvedData, error: resolvedError };

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue(result),
      upsert: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  >;
}

describe("fetchPaymentSettings", () => {
  it("returns parsed settings from rows", async () => {
    const rows = [
      { key: "timeout_awaiting_payment_hours", value: "24" },
      { key: "timeout_pending_verification_hours", value: "48" },
      { key: "timeout_evidence_requested_hours", value: "12" },
    ];
    const supabase = createMockSupabase(rows);

    const result = await fetchPaymentSettings(supabase);
    expect(result).toEqual({
      timeout_awaiting_payment_hours: 24,
      timeout_pending_verification_hours: 48,
      timeout_evidence_requested_hours: 12,
    });
  });

  it("uses defaults for missing or invalid values", async () => {
    const rows = [{ key: "timeout_awaiting_payment_hours", value: "0" }];
    const supabase = createMockSupabase(rows);

    const result = await fetchPaymentSettings(supabase);
    // 0 is falsy so Number("0") || default = default
    expect(result.timeout_awaiting_payment_hours).toBe(48);
    expect(result.timeout_pending_verification_hours).toBe(72);
    expect(result.timeout_evidence_requested_hours).toBe(24);
  });

  it("handles null data", async () => {
    const supabase = createMockSupabase(null);
    const result = await fetchPaymentSettings(supabase);
    expect(result).toEqual({
      timeout_awaiting_payment_hours: 48,
      timeout_pending_verification_hours: 72,
      timeout_evidence_requested_hours: 24,
    });
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, { message: "DB error" });
    await expect(fetchPaymentSettings(supabase)).rejects.toEqual({
      message: "DB error",
    });
  });
});

describe("updatePaymentSetting", () => {
  it("resolves on success", async () => {
    const supabase = createMockSupabase(null);
    await expect(
      updatePaymentSetting(supabase, "timeout_awaiting_payment_hours", 48),
    ).resolves.toBeUndefined();
  });

  it("calls upsert with correct params", async () => {
    const supabase = createMockSupabase(null);
    await updatePaymentSetting(supabase, "timeout_awaiting_payment_hours", 48);

    const fromResult = (supabase.from as ReturnType<typeof vi.fn>).mock
      .results[0].value;
    expect(fromResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "timeout_awaiting_payment_hours",
        value: "48",
      }),
    );
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, { message: "Upsert fail" });
    await expect(updatePaymentSetting(supabase, "key", 1)).rejects.toEqual({
      message: "Upsert fail",
    });
  });
});
