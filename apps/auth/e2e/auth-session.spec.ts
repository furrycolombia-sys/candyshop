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
