import { type BrowserContext, chromium, expect, test } from "@playwright/test";
import * as path from "node:path";

const PROFILE_DIR = path.join(__dirname, ".auth", "chrome-profile-google");

test("Google OAuth login flow", async () => {
  const googleEmail = process.env.GOOGLE_TEST_EMAIL;
  const googlePassword = process.env.GOOGLE_TEST_PASSWORD;

  test.skip(
    !googleEmail || !googlePassword,
    "GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD required",
  );

  test.setTimeout(120_000);

  const context: BrowserContext = await chromium.launchPersistentContext(
    PROFILE_DIR,
    {
      headless: false,
      channel: "chrome",
      viewport: { width: 1280, height: 720 },
      args: ["--disable-blink-features=AutomationControlled"],
    },
  );

  const page = context.pages()[0] || (await context.newPage());

  try {
    // 1. Login page
    await page.goto("http://localhost:5000/en/login");
    await expect(page.getByTestId("login-card")).toBeVisible();
    console.log("[e2e] ✓ Login page loaded");

    // 2. Click Google
    await page.getByTestId("login-google").click();
    console.log("[e2e] Clicked Google...");

    // 3. Wait for Google
    await page.waitForURL(
      (url) =>
        url.hostname.includes("google") || url.href.includes("localhost:5000"),
      { timeout: 30000 },
    );
    console.log("[e2e] ✓ Navigated to:", page.url());

    // 4. If already back (persistent session auto-authorized)
    if (page.url().includes("localhost:5000")) {
      console.log("[e2e] Auto-authorized from persistent session");
    } else {
      // Handle Google login
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log("[e2e] Filling email...");
        await emailInput.fill(googleEmail!);

        // Click Next (try multiple selectors)
        await page
          .locator(
            '#identifierNext button, button:has-text("Next"), button:has-text("Siguiente")',
          )
          .first()
          .click();
        console.log("[e2e] ✓ Submitted email");

        // Wait for password field (Google has a hidden + visible password input)
        const passwordInput = page.locator('input[name="Passwd"]');
        await passwordInput.waitFor({ state: "visible", timeout: 15000 });
        await page.waitForTimeout(1000); // Google animation
        await passwordInput.fill(googlePassword!);

        // Click Next for password
        await page
          .locator(
            '#passwordNext button, button:has-text("Next"), button:has-text("Siguiente")',
          )
          .first()
          .click();
        console.log("[e2e] ✓ Submitted password");
      }

      // Wait for Google to process — could redirect through multiple pages
      console.log("[e2e] Waiting for Google to process...");

      // Wait for either: back to our app, or a consent page, or still on Google
      await page
        .waitForURL(
          (url) =>
            url.href.includes("localhost:5000") ||
            url.pathname.includes("/signin/oauth/consent") ||
            url.pathname.includes("/signin/oauth/id"),
          { timeout: 30000 },
        )
        .catch(() => {
          console.log("[e2e] Still waiting, current URL:", page.url());
        });

      await page.waitForTimeout(3000);
      console.log("[e2e] After processing:", page.url());
      await page.screenshot({
        path: "e2e/screenshots/google-after-processing.png",
      });

      // If on consent page, handle it
      if (
        page.url().includes("google.com") &&
        !page.url().includes("localhost")
      ) {
        console.log("[e2e] On Google consent/auth page...");

        // Google consent: "Allow", "Continue", "Continuar", or auto-redirect
        const consentSelectors = [
          'button:has-text("Continue")',
          'button:has-text("Continuar")',
          'button:has-text("Allow")',
          'button:has-text("Permitir")',
          "#submit_approve_access",
          'button[data-idom-class*="primary"]',
        ];

        for (const sel of consentSelectors) {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log("[e2e] Clicking consent button:", sel);
            await btn.click();
            break;
          }
        }

        // Wait for redirect back
        await page.waitForURL(/localhost:5000/, { timeout: 30000 });
      }
    }

    console.log("[e2e] ✓ Back on app:", page.url());

    // 5. Wait for page to settle
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/google-final.png" });
    console.log("[e2e] Final URL:", page.url());

    // 6. Verify account page
    const isAccountPage = await page
      .getByTestId("account-card")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isAccountPage) {
      const cookies = await context.cookies();
      console.log(
        "[e2e] Cookies:",
        cookies.map((c) => c.name),
      );
      console.log("[e2e] URL:", page.url());
    }

    expect(isAccountPage, "Should show account page").toBe(true);
    await expect(page.getByTestId("account-email")).not.toBeEmpty();
    await expect(page.getByTestId("nav-user-email")).toBeVisible();
    console.log("[e2e] ✓ All passed!");
  } finally {
    await context.close();
  }
});
