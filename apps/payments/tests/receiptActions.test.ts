import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const USER_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const OTHER_ORDER = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const SESSION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const ok = (json: unknown) =>
  ({ ok: true, json: async () => json }) as Response;

/** A receipt the validator accepts. */
const receipt = () =>
  new File([new Uint8Array([1, 2, 3])], "proof.png", { type: "image/png" });

async function loadActions(signedIn = true) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();

  const actions = await import("@/shared/infrastructure/receiptActions");
  const supabaseModule = await import("api/supabase/server");

  vi.mocked(supabaseModule.createServerSupabaseClient).mockResolvedValue({
    rpc: vi
      .fn()
      .mockResolvedValue({ data: signedIn ? USER_ID : null, error: null }),
  } as unknown as Awaited<
    ReturnType<typeof supabaseModule.createServerSupabaseClient>
  >);

  return actions;
}

const lastUrl = () => String(vi.mocked(fetch).mock.calls.at(-1)?.[0]);

describe("receipt upload actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  // A server action is a public POST endpoint that Next.js authenticates for
  // nobody, and these upload with the service role key, which bypasses the
  // storage policies.
  describe("uploadCheckoutReceipt", () => {
    it("refuses a caller with no session, before touching storage", async () => {
      const { uploadCheckoutReceipt } = await loadActions(false);

      const result = await uploadCheckoutReceipt(SESSION_ID, receipt());

      expect(result).toEqual({ ok: false, code: "upload_failed" });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("uploads for a signed-in caller", async () => {
      const { uploadCheckoutReceipt } = await loadActions();
      vi.mocked(fetch).mockResolvedValueOnce(ok({}));

      const result = await uploadCheckoutReceipt(SESSION_ID, receipt());

      expect(result.ok).toBe(true);
      expect(lastUrl()).toContain(`/receipts/${SESSION_ID}/`);
    });

    it("rejects a file of the wrong type without uploading", async () => {
      const { uploadCheckoutReceipt } = await loadActions();

      const result = await uploadCheckoutReceipt(
        SESSION_ID,
        new File(["x"], "notes.txt", { type: "text/plain" }),
      );

      expect(result).toEqual({ ok: false, code: "invalid_receipt_type" });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("reports a storage failure as upload_failed", async () => {
      const { uploadCheckoutReceipt } = await loadActions();
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "boom",
      } as Response);

      const result = await uploadCheckoutReceipt(SESSION_ID, receipt());
      expect(result).toEqual({ ok: false, code: "upload_failed" });
    });
  });

  describe("uploadOrderReceipt", () => {
    it("refuses a caller with no session", async () => {
      const { uploadOrderReceipt } = await loadActions(false);

      const result = await uploadOrderReceipt(OTHER_ORDER, receipt());

      expect(result).toEqual({ ok: false, code: "upload_failed" });
      expect(fetch).not.toHaveBeenCalled();
    });

    // The order id alone used to be enough to write into any order's prefix.
    it("scopes the order lookup to the caller", async () => {
      const { uploadOrderReceipt } = await loadActions();
      vi.mocked(fetch).mockResolvedValueOnce(ok([]));

      await uploadOrderReceipt(OTHER_ORDER, receipt());

      const url = String(vi.mocked(fetch).mock.calls[0]?.[0]);
      expect(url).toContain(`id=eq.${OTHER_ORDER}`);
      expect(url).toContain(`user_id=eq.${USER_ID}`);
    });

    it("refuses an order that is not the caller's", async () => {
      const { uploadOrderReceipt } = await loadActions();
      vi.mocked(fetch).mockResolvedValueOnce(ok([]));

      const result = await uploadOrderReceipt(OTHER_ORDER, receipt());

      expect(result).toEqual({ ok: false, code: "upload_failed" });
      // The lookup happened; the upload did not.
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("uploads under the order's checkout session", async () => {
      const { uploadOrderReceipt } = await loadActions();
      vi.mocked(fetch)
        .mockResolvedValueOnce(ok([{ checkout_session_id: SESSION_ID }]))
        .mockResolvedValueOnce(ok({}));

      const result = await uploadOrderReceipt(OTHER_ORDER, receipt());

      expect(result.ok).toBe(true);
      expect(lastUrl()).toContain(`/receipts/${SESSION_ID}/`);
    });
  });
});
