import { test, expect } from "./fixtures/auth.fixture";

const AUTH_URL = "http://localhost:5000";
const STORE_URL = "http://localhost:5001";

test.describe("Auth session", () => {
  test("login page renders with social buttons", async ({ page }) => {
    await page.goto(`${AUTH_URL}/en/login`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-discord")).toBeVisible();
  });

  test("Discord button redirects to Discord OAuth", async ({ page }) => {
    await page.goto(`${AUTH_URL}/en/login`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("login-discord").click();

    // Should redirect to Discord's OAuth page
    await page.waitForURL("**/discord.com/**", { timeout: 10000 });
    expect(page.url()).toContain("discord.com/oauth2/authorize");
    expect(page.url()).toContain("client_id=");
  });

  test("authenticated session persists across apps", async ({
    page,
    authenticatedPage,
  }) => {
    // Visit auth app — should have session and show email in navbar
    await page.goto(`${AUTH_URL}/en`);
    await page.waitForLoadState("networkidle");

    const authNavEmail = page.getByTestId("nav-user-email");
    await expect(authNavEmail).toBeVisible();
    await expect(authNavEmail).not.toBeEmpty();

    // Visit store app — session should persist, email visible
    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    const storeNavEmail = page.getByTestId("nav-user-email");
    await expect(storeNavEmail).toBeVisible();
    await expect(storeNavEmail).not.toBeEmpty();

    expect(authenticatedPage.email).toContain("@test.invalid");
  });
});
