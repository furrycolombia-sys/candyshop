import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * Verifies that all NEXT_PUBLIC_*_URL env vars produce absolute URLs
 * in appUrls. If any URL is relative (e.g. "/studio"), cross-app
 * navigation breaks — links resolve against the current app's origin
 * instead of the target app's origin.
 */
describe("appUrls", () => {
  const EXPECTED_PORTS: Record<string, string> = {
    landing: "5004",
    store: "5001",
    studio: "5006",
    payments: "5005",
    admin: "5002",
    auth: "5000",
    playground: "5003",
  };

  beforeAll(() => {
    // Simulate the env vars that .env.example provides
    for (const [app, port] of Object.entries(EXPECTED_PORTS)) {
      const key = `NEXT_PUBLIC_${app.toUpperCase()}_URL`;
      vi.stubEnv(key, `http://localhost:${port}`);
    }
  });

  it("all app URLs are absolute (start with http)", async () => {
    const { appUrls } = await import("./appUrls");

    for (const [app, url] of Object.entries(appUrls)) {
      expect(
        url,
        `appUrls.${app} is "${url}" — must be absolute (http://...) not relative`,
      ).toMatch(/^https?:\/\//);
    }
  });

  it("each app URL points to its expected port", async () => {
    const { appUrls } = await import("./appUrls");

    for (const [app, url] of Object.entries(appUrls)) {
      const port = EXPECTED_PORTS[app];
      expect(url, `appUrls.${app} should contain port ${port}`).toContain(
        `:${port}`,
      );
    }
  });

  it("no app URL falls back to a relative path", async () => {
    const { appUrls } = await import("./appUrls");

    for (const [app, url] of Object.entries(appUrls)) {
      expect(
        url,
        `appUrls.${app} is "${url}" — relative fallback detected, env var missing`,
      ).not.toMatch(/^\//);
    }
  });
});
