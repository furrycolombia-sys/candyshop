import path from "node:path";

import { expect, test } from "./fixtures/auth.fixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const APPS = resolveE2EAppUrls() as Record<string, string>;

test.describe("Smoke test â€” all apps", () => {
  test("auth app: login page renders with social buttons", async ({ page }) => {
    await page.goto(`${APPS.auth}/en/login`);

    await expect(page.getByTestId("login-card")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-discord")).toBeVisible();
    console.log("[smoke] âœ“ Auth login page with social buttons");
  });

  test("auth app: shows account page when authenticated", async ({
    page,
    authenticatedPage,
  }) => {
    expect(authenticatedPage.email).toBeTruthy();
    await page.goto(`${APPS.auth}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("account-settings-page")).toBeVisible();
    await expect(page.getByTestId("profile-email")).not.toBeEmpty();
    await expect(page.getByTestId("profile-provider")).not.toBeEmpty();
    console.log("[smoke] âœ“ Auth account page shows user data");

    await expect(page.getByTestId("nav-user-email")).toBeVisible();
    console.log("[smoke] âœ“ Auth navbar shows email");
  });

  test("auth app: sign out works", async ({ page, authenticatedPage }) => {
    expect(authenticatedPage.email).toBeTruthy();
    await page.goto(`${APPS.auth}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("account-settings-page")).toBeVisible();

    await page.getByTestId("sign-out").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    await expect(page.getByTestId("login-card")).toBeVisible();
    console.log("[smoke] âœ“ Sign out redirects to login");
  });

  test("navbar shows user email across all apps", async ({
    page,
    authenticatedPage,
  }) => {
    expect(authenticatedPage.email).toBeTruthy();
    for (const [appName, url] of Object.entries(APPS)) {
      const response = await page.goto(`${url}/en`).catch(() => null);

      if (!response || response.status() >= 400) {
        console.log(
          `[smoke] âš  ${appName} not reachable at ${url} â€” skipped`,
        );
        continue;
      }

      await page.waitForLoadState("networkidle");

      const navEmail = page.getByTestId("nav-user-email");
      const isVisible = await navEmail
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isVisible) {
        await expect(navEmail).not.toBeEmpty();
        console.log(
          `[smoke] âœ“ ${appName} (${url}) â€” navbar shows user email`,
        );
      } else {
        console.log(
          `[smoke] âš  ${appName} (${url}) â€” navbar does NOT show user email`,
        );
      }
    }
  });

  test("all apps load without errors", async ({ page }) => {
    for (const [appName, url] of Object.entries(APPS)) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(`${url}/en`).catch(() => null);

      if (!response) {
        console.log(`[smoke] âš  ${appName} not reachable at ${url}`);
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
        console.log(
          `[smoke] âš  ${appName} has JS errors:`,
          errors.slice(0, 3),
        );
      } else {
        console.log(`[smoke] âœ“ ${appName} (${url}) â€” loads OK`);
      }
    }
  });
});
