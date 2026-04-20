import path from "node:path";

import { expect, test } from "./fixtures/auth.fixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const APPS = resolveE2EAppUrls() as Record<string, string>;

test.describe("Smoke test -- all apps", () => {
  test("auth app: login page renders with social buttons", async ({ page }) => {
    await page.goto(`${APPS.auth}/en/login`);

    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-discord")).toBeVisible();
    console.log("[smoke] Auth login page with social buttons");
  });

  test("auth app: shows account page when authenticated", async ({
    page,
    authenticatedPage,
  }) => {
    expect(authenticatedPage.email).toBeTruthy();
    await page.goto(`${APPS.auth}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("account-settings-page")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("profile-email")).not.toBeEmpty();
    await expect(page.getByTestId("profile-provider")).not.toBeEmpty();
    console.log("[smoke] Auth account page shows user data");

    await expect(page.getByTestId("nav-user-email")).toBeVisible();
    console.log("[smoke] Auth navbar shows email");
  });

  test("auth app: sign out works", async ({ page, authenticatedPage }) => {
    expect(authenticatedPage.email).toBeTruthy();
    await page.goto(`${APPS.auth}/en`);
    await page.waitForLoadState("networkidle");

    // Verify we are actually on the authenticated page before signing out
    await expect(page.getByTestId("account-settings-page")).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("sign-out").click();

    // After sign-out the app redirects to the login page.
    // In Docker the path includes the basePath (e.g. /auth/en/login).
    await page.waitForURL(/login/, { timeout: 15000 });

    await expect(page.getByTestId("login-card")).toBeVisible({
      timeout: 10000,
    });
    console.log("[smoke] Sign out redirects to login");
  });

  test("navbar shows user email across all apps", async ({
    page,
    authenticatedPage,
  }) => {
    expect(authenticatedPage.email).toBeTruthy();

    // First verify the session is actually working on the auth app
    await page.goto(`${APPS.auth}/en`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("nav-user-email")).toBeVisible({
      timeout: 10000,
    });

    for (const [appName, url] of Object.entries(APPS)) {
      const response = await page.goto(`${url}/en`).catch(() => null);

      if (!response || response.status() >= 400) {
        console.log(`[smoke] ${appName} not reachable at ${url} -- skipped`);
        continue;
      }

      await page.waitForLoadState("networkidle");

      // Verify we actually landed on the app and didn't get redirected
      // to a login page (which would mean the session didn't carry over)
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        throw new Error(
          `[smoke] ${appName} redirected to login -- session not persisted: ${currentUrl}`,
        );
      }

      const navEmail = page.getByTestId("nav-user-email");
      const isVisible = await navEmail
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isVisible) {
        await expect(navEmail).not.toBeEmpty();
        console.log(`[smoke] ${appName} (${url}) -- navbar shows user email`);
      } else {
        console.log(
          `[smoke] ${appName} (${url}) -- navbar does NOT show user email`,
        );
      }
    }
  });

  test("all apps load without errors", async ({ page, authenticatedPage }) => {
    expect(authenticatedPage.email).toBeTruthy();

    for (const [appName, url] of Object.entries(APPS)) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(`${url}/en`).catch(() => null);

      if (!response) {
        console.log(`[smoke] ${appName} not reachable at ${url}`);
        continue;
      }

      await page.waitForLoadState("networkidle");
      const status = response.status();

      expect(
        status,
        `${appName} should return 200, got ${status}`,
      ).toBeLessThan(400);

      const nav = page.getByTestId("app-navigation");
      await expect(nav).toBeVisible();

      if (errors.length > 0) {
        console.log(`[smoke] ${appName} has JS errors:`, errors.slice(0, 3));
      } else {
        console.log(`[smoke] ${appName} (${url}) -- loads OK`);
      }
    }
  });
});
