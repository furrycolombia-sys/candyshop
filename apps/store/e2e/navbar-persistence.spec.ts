import path from "node:path";

import { test, expect } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const {
  store: STORE_URL,
  studio: STUDIO_URL,
  payments: PAYMENTS_URL,
} = resolveE2EAppUrls();

/**
 * These tests verify that the AppNavigation remains stable (no pop-in) when a
 * user navigates between apps. They rely on the nav-perm cookie being written
 * on first load, so they run AFTER at least one authenticated page visit.
 *
 * Target env: staging (TARGET_ENV=staging pnpm test:e2e).
 */
test.describe("Navbar persistence across cross-app navigations", () => {
  test.beforeEach(async ({ page }) => {
    // Seed the nav-perm cookie by visiting the store once.
    // This simulates a returning user whose cookie is already set.
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    // Wait for the permission fetch to complete and cookie to be written.
    await page.waitForTimeout(1500);
  });

  test("navbar is visible immediately after navigating store → studio", async ({
    page,
  }) => {
    await page.goto(`${STUDIO_URL}/en`);

    // Nav must be visible without waiting — no flash allowed
    await expect(page.getByTestId("app-navigation")).toBeVisible();
  });

  test("navbar is visible immediately after navigating store → payments", async ({
    page,
  }) => {
    await page.goto(`${PAYMENTS_URL}/en`);

    await expect(page.getByTestId("app-navigation")).toBeVisible();
  });

  test("active link has aria-current=page after cross-app navigation", async ({
    page,
  }) => {
    // Navigate to studio
    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();

    await expect(page.getByTestId("nav-link-studio")).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Store link must NOT be marked current
    await expect(page.getByTestId("nav-link-store")).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("gated app links remain visible on every navigation (no pop-in)", async ({
    page,
  }) => {
    // Navigate store → studio → payments, asserting stability at each stop
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();

    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();

    await page.goto(`${PAYMENTS_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
    await expect(page.getByTestId("nav-link-payments")).toBeVisible();
  });

  test("nav-perm cookie is present after first authenticated load", async ({
    page,
  }) => {
    const cookies = await page.context().cookies();
    const navCookie = cookies.find((c) => c.name === "candystore-nav-perm");
    expect(navCookie).toBeDefined();
    expect(navCookie!.value).not.toBe("");
  });

  test("nav-perm cookie is cleared after the session cookie is removed", async ({
    page,
    context,
  }) => {
    // Simulate logout by clearing auth cookies
    await context.clearCookies();

    // Navigate — no auth means clearNavPermCache should have been called
    await page.goto(`${STORE_URL}/en`);
    await page.waitForTimeout(1500);

    const remaining = await context.cookies();
    const navCookie = remaining.find((c) => c.name === "candystore-nav-perm");
    expect(navCookie).toBeUndefined();
  });
});
