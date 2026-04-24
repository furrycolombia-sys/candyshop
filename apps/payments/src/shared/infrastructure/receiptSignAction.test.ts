import { afterEach, describe, expect, it, vi } from "vitest";

import { signReceiptUrl } from "./receiptSignAction";

describe("signReceiptUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns null when the storage API responds with an error status", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBeNull();
  });

  it("returns null when the fetch call throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBeNull();
  });

  it("returns null when service role env vars are not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBeNull();
  });

  it("returns a fully-qualified signed url for valid storage paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          signedURL:
            "/storage/v1/object/sign/receipts/order-123/receipt.png?token=abc",
        }),
      }),
    );

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBe(
      "https://supabase.example.com/storage/v1/object/sign/receipts/order-123/receipt.png?token=abc",
    );
  });

  it("normalises signedURL from local Supabase CLI (missing /storage/v1 prefix)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Local Supabase CLI omits /storage/v1 in the returned path
          signedURL: "/object/sign/receipts/order-123/receipt.png?token=abc",
        }),
      }),
    );

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBe(
      "https://supabase.example.com/storage/v1/object/sign/receipts/order-123/receipt.png?token=abc",
    );
  });

  it("returns null when the API response has no signedURL field", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    await expect(signReceiptUrl("order-123/receipt.png")).resolves.toBeNull();
  });

  it("uses SUPABASE_URL_INTERNAL as the fetch target when set", async () => {
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- internal Docker hostname, not a real plaintext connection
    const internalUrl = "http://internal-host:5432";
    vi.stubEnv("SUPABASE_URL_INTERNAL", internalUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_key_test");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        signedURL:
          "/storage/v1/object/sign/receipts/order-123/receipt.png?token=xyz",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await signReceiptUrl("order-123/receipt.png");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(internalUrl),
      expect.any(Object),
    );
  });
});
