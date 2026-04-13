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

  test("Discord button redirects to Discord OAuth", async ({ page }) => {
    await page.goto(`${AUTH_URL}/en/login`);

    await page.getByTestId("login-discord").click();

    await page.waitForURL("**/discord.com/**", { timeout: 10000 });
    expect(page.url()).toContain("discord.com/oauth2/authorize");
    expect(page.url()).toContain("client_id=");
  });

  test("authenticated session persists across apps", async ({
    page,
    authenticatedPage,
  }) => {
    await page.goto(`${AUTH_URL}/en`);
    await page.waitForLoadState("networkidle");

    const authNavEmail = page.getByTestId("nav-user-email");
    await expect(authNavEmail).toBeVisible();
    await expect(authNavEmail).not.toBeEmpty();

    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    const storeNavEmail = page.getByTestId("nav-user-email");
    await expect(storeNavEmail).toBeVisible();
    await expect(storeNavEmail).not.toBeEmpty();

    expect(authenticatedPage.email).toContain("@test.invalid");
  });
});
