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
    await expect(page.getByTestId("nav-user-email")).toBeVisible({
      timeout: 10000,
    });

    for (const [appName, url] of Object.entries(APPS)) {
      const response = await page.goto(`${url}/en`).catch(() => null);

      // This used to log "not reachable -- skipped" and `continue`, so a smoke
      // test whose whole purpose is "every app loads" stayed green with every
      // app down. An app that does not respond is the failure.
      expect(response, `${appName} did not respond at ${url}`).not.toBeNull();
      expect(
        response?.status() ?? 0,
        `${appName} returned ${response?.status()} at ${url}`,
      ).toBeLessThan(400);

      // Verify we actually landed on the app and didn't get redirected
      // to a login page (which would mean the session didn't carry over).
      // toHaveURL retries, so it both waits and asserts -- the settle wait
      // it replaces was only ever making a single later snapshot likelier
      // to be right.
      await expect(page).not.toHaveURL(/\/login/);

      const currentUrl = page.url();
      expect(
        currentUrl,
        `${appName} redirected to login -- session not persisted`,
      ).not.toContain("/login");

      // This is the assertion the test exists for: the session injected once
      // must be visible in every app's navbar. It used to be wrapped in
      // `if (isVisible)` with an else branch that only logged, so the test
      // passed when the navbar showed no user at all -- the exact symptom of
      // session propagation being broken.
      const navEmail = page.getByTestId("nav-user-email");
      await expect(
        navEmail,
        `${appName} (${url}) navbar does not show the signed-in user`,
      ).toBeVisible({ timeout: 5000 });
      await expect(navEmail).not.toBeEmpty();
    }
  });

  test("all apps load without errors", async ({ page, authenticatedPage }) => {
    expect(authenticatedPage.email).toBeTruthy();

    const thrown: Record<string, string[]> = {};

    // ONE listener, registered before the loop, writing to whichever app is
    // currently loaded. Registering it inside the loop -- as this test used to
    // -- adds a listener per iteration and never removes any, so every app's
    // array receives the errors of every app visited after it. `landing` is
    // first in APPS, so it collected all seven apps' errors and was blamed for
    // a React #418 that could not be reproduced against it.
    let currentApp = "";
    page.on("pageerror", (err) => {
      thrown[currentApp]?.push(err.message);
    });

    for (const [appName, url] of Object.entries(APPS)) {
      currentApp = appName;
      thrown[appName] = [];

      const response = await page.goto(`${url}/en`).catch(() => null);

      expect(response, `${appName} did not respond at ${url}`).not.toBeNull();

      await page.waitForLoadState("networkidle");
      const status = response?.status() ?? 0;

      expect(
        status,
        `${appName} should return 200, got ${status}`,
      ).toBeLessThan(400);

      const nav = page.getByTestId("app-navigation");
      await expect(nav).toBeVisible();
    }

    // The test is called "all apps load without errors". It used to collect
    // page errors and then only log them, so it passed while an app threw on
    // load -- the single thing it exists to catch.
    //
    // No app is excluded. The previous exclusion named `landing` on the
    // strength of an attribution that was wrong by construction; with the
    // listener fixed, whatever this reports is the app that actually threw.
    const failed = Object.entries(thrown)
      .filter(([, errors]) => errors.length > 0)
      .map(([appName, errors]) => `${appName}: ${errors.join(" | ")}`);

    expect(failed, "apps threw on load").toEqual([]);
  });
});
