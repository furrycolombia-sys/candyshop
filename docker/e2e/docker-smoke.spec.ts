import { test, expect } from "@playwright/test";

/**
 * Docker Deployment Smoke Tests
 *
 * Validates the combined Docker container serves all apps
 * correctly through the nginx reverse proxy.
 *
 * These tests run against a live Docker container (no dev server).
 * The container exposes nginx on a single port with:
 *   /           -> landing app (port 5000)
 *   /store      -> store app
 *   /admin      -> admin app (port 5002)
 *   /auth       -> auth app
 *   /playground -> playground app (port 5003)
 *   /payments   -> payments app
 *   /studio     -> studio app
 *   /health     -> nginx 200 OK
 *
 * The Docker image is built with NEXT_PUBLIC_ENABLE_TEST_IDS=true
 * so data-testid attributes are available for stable selectors.
 */

test.describe("Docker Smoke", () => {
  test("/health returns 200", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.status()).toBe(200);
  });

  test("/ returns content or redirect", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    // Landing app may serve directly (200) or redirect to locale (307/308)
    expect([200, 307, 308]).toContain(response.status());
  });

  test("/store returns redirect", async ({ request }) => {
    const response = await request.get("/store", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });

  test("/admin returns redirect", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });

  test("/auth returns redirect", async ({ request }) => {
    const response = await request.get("/auth", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });

  test("/playground returns redirect", async ({ request }) => {
    const response = await request.get("/playground", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });

  test("/studio returns redirect", async ({ request }) => {
    const response = await request.get("/studio", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
  });
});

test.describe("Docker Auth Flow", () => {
  test("auth login page renders with social login buttons", async ({
    page,
  }) => {
    await page.goto("/auth/en/login");

    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-discord")).toBeVisible();
  });
});
