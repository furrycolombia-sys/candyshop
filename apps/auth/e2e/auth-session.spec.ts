import path from "node:path";

import { expect, test } from "./fixtures/auth.fixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const { auth: AUTH_URL, store: STORE_URL } = resolveE2EAppUrls();

test.describe("Auth session", () => {
  test("login page renders with social buttons", async ({ page }) => {
    await page.goto(`${AUTH_URL}/en/login`);

    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-discord")).toBeVisible();
  });

  test("Google login redirects through the correct Supabase instance", async ({
    page,
  }) => {
    await page.goto(`${AUTH_URL}/en/login`);
    await expect(page.getByTestId("login-google")).toBeVisible();

    // Intercept the Supabase auth redirect to inspect the URL without
    // actually navigating to Google (which would require real credentials).
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/auth/v1/authorize"), {
        timeout: 10000,
      }),
      page.getByTestId("login-google").click(),
    ]);

    const authorizeUrl = new URL(request.url());

    // The authorize request must go to the Supabase instance configured
    // for this environment. In local/e2e mode that's localhost:54321;
    // against production it's the Supabase Cloud host (e.g. *.supabase.co).
    const expectedSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "localhost";
    expect(
      authorizeUrl.hostname,
      `Supabase authorize URL should hit ${expectedSupabaseUrl}, got ${authorizeUrl.hostname}`,
    ).toBe(expectedSupabaseUrl);

    // The redirect_to parameter tells Supabase where to send the user
    // after the OAuth flow completes. It must point back to the app
    // under test (e2e container or production site).
    const redirectTo = authorizeUrl.searchParams.get("redirect_to");
    expect(
      redirectTo,
      "redirect_to parameter must be present in the authorize URL",
    ).toBeTruthy();

    // The redirect_to should contain the auth callback path
    expect(
      redirectTo,
      `redirect_to should contain /auth/callback, got: ${redirectTo}`,
    ).toContain("/auth/callback");
  });

  test("authenticated session persists across apps", async ({
    page,
    authenticatedPage,
  }) => {
    // Verify the session fixture actually created a user
    expect(authenticatedPage.email).toContain("@test.invalid");

    // Auth app: verify we land on the account page, not login
    await page.goto(`${AUTH_URL}/en`);
    await page.waitForLoadState("networkidle");

    expect(page.url(), "Auth app should not redirect to login").not.toContain(
      "/login",
    );

    const authNavEmail = page.getByTestId("nav-user-email");
    await expect(authNavEmail).toBeVisible({ timeout: 10000 });
    await expect(authNavEmail).not.toBeEmpty();

    // Store app: verify session persists cross-app
    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    expect(page.url(), "Store app should not redirect to login").not.toContain(
      "/login",
    );

    const storeNavEmail = page.getByTestId("nav-user-email");
    await expect(storeNavEmail).toBeVisible({ timeout: 10000 });
    await expect(storeNavEmail).not.toBeEmpty();
  });
});
