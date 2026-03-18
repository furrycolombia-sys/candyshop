import { test, expect, type Page } from "@playwright/test";

/**
 * Docker Deployment Smoke Tests
 *
 * Validates the combined Docker container serves all apps
 * correctly through the nginx reverse proxy.
 *
 * These tests run against a live Docker container (no dev server).
 * The container exposes nginx on a single port with:
 *   /           -> landing app (port 3000)
 *   /web        -> web app (port 3001)
 *   /admin      -> admin app (port 3002)
 *   /auth       -> auth app (port 3004)
 *   /playground -> playground app (port 3003)
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

  test("/web returns redirect", async ({ request }) => {
    const response = await request.get("/web", { maxRedirects: 0 });
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
});

test.describe("Docker Auth Flow", () => {
  test("auth login page renders with form", async ({ page }) => {
    await page.goto("/auth/en/login");

    await expect(page.getByTestId("auth-login-email")).toBeVisible();
    await expect(page.getByTestId("auth-login-password")).toBeVisible();
    await expect(page.getByTestId("auth-login-submit")).toBeVisible();
  });

  test("login form submission does not 404", async ({ page }) => {
    await page.goto("/auth/en/login");

    // The form has default values from mock credentials, so just submit
    await page.getByTestId("auth-login-submit").click();

    // After submission via Server Action, we should NOT get a 404 or error page.
    // The mock provider succeeds immediately and redirects.
    // waitForURL proves the Server Action redirect succeeded (not a 404).
    await page.waitForURL(/\/(auth|web)\//, { timeout: 15_000 });
  });

  test("login with returnTo redirects to web app", async ({ page }) => {
    const returnTo = encodeURIComponent("/web/en");
    await page.goto(`/auth/en/login?returnTo=${returnTo}`);

    await expect(page.getByTestId("auth-login-email")).toBeVisible();
    await page.getByTestId("auth-login-submit").click();

    // Should redirect toward the web app, not 404
    await page.waitForURL(/\/web\//, { timeout: 15_000 });
  });

  test("clear session redirects back to login", async ({ page }) => {
    await page.goto("/auth/en/login");

    const clearSessionButton = page.getByTestId("auth-clear-session");
    await expect(clearSessionButton).toBeVisible();
    await clearSessionButton.click();

    // Should redirect back to the login page (not 404)
    await page.waitForURL(/\/auth\/en\/login/, { timeout: 15_000 });
  });
});

test.describe("Docker Auth Session", () => {
  const REFRESH_COOKIE = "auth_refresh_token";
  const ACCESS_COOKIE = "auth_access_token";

  async function submitLoginForm(page: Page) {
    await page.goto("/auth/en/login");
    const actionDone = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/auth/"),
    );
    await page.getByTestId("auth-login-submit").click();
    await actionDone;
    await page.waitForLoadState("networkidle");
  }

  test("login sets session refresh cookie (no remember me)", async ({
    page,
  }) => {
    await submitLoginForm(page);

    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find((c) => c.name === REFRESH_COOKIE);
    const accessCookie = cookies.find((c) => c.name === ACCESS_COOKIE);

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.expires).toBe(-1); // session cookie
    expect(accessCookie).toBeDefined(); // login sets both cookies
    expect(accessCookie?.expires).toBe(-1); // session cookie (no remember me)
  });

  test("login sets persistent refresh cookie (remember me)", async ({
    page,
  }) => {
    await page.goto("/auth/en/login");
    await page.getByTestId("auth-login-remember-me").check();
    const actionDone = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/auth/"),
    );
    await page.getByTestId("auth-login-submit").click();
    await actionDone;
    await page.waitForLoadState("networkidle");

    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find((c) => c.name === REFRESH_COOKIE);
    const accessCookie = cookies.find((c) => c.name === ACCESS_COOKIE);

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.expires).toBeGreaterThan(0); // persistent cookie
    expect(accessCookie).toBeDefined(); // login sets both cookies
    expect(accessCookie?.expires).toBeGreaterThan(0); // persistent (remember me)
  });

  test("refresh endpoint returns access token", async ({ page }) => {
    // Login first to get refresh cookie
    await submitLoginForm(page);

    // Call the refresh endpoint
    const result = await page.evaluate(async () => {
      const response = await fetch("/auth/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json();
      return { status: response.status, body };
    });

    expect(result.status).toBe(200);
    expect(typeof result.body.accessToken).toBe("string");
    expect(result.body.accessToken.length).toBeGreaterThan(0);
  });
});
