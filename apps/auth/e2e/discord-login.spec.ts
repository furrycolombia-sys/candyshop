import { type BrowserContext, chromium, expect, test } from "@playwright/test";
import * as path from "node:path";

const PROFILE_DIR = path.join(__dirname, ".auth", "chrome-profile");

test("Discord OAuth login flow", async () => {
  const discordEmail = process.env.DISCORD_TEST_EMAIL;
  const discordPassword = process.env.DISCORD_TEST_PASSWORD;

  test.skip(
    !discordEmail || !discordPassword,
    "DISCORD_TEST_EMAIL and DISCORD_TEST_PASSWORD required",
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

    // 2. Click Discord
    await page.getByTestId("login-discord").click();
    console.log("[e2e] Clicked Discord...");

    // 3. Wait for Discord (login or authorize page)
    await page.waitForURL(/discord\.com/, { timeout: 30000 });
    console.log("[e2e] ✓ On Discord:", page.url());

    // 4. Handle Discord — could be login page OR authorize page
    //    Wait for either the login form or the authorize button
    const emailInput = page.locator('input[name="email"]');
    // Discord's authorize button — use multiple strategies
    const authorizeBtn = page
      .locator(
        'button:has-text("Authorize"), button:has-text("Autorizar"), button:has-text("Allow"), button[class*="colorBrand"], button[class*="lookFilled"]:not(:has-text("Cancel"))',
      )
      .first();

    console.log("[e2e] Waiting for Discord page to load...");
    await page.waitForTimeout(5000);

    // Determine what Discord is showing
    let firstVisible: "login" | "authorize" | "redirected";
    if (page.url().includes("localhost:5000")) {
      firstVisible = "redirected";
    } else if (page.url().includes("/login")) {
      await emailInput.waitFor({ state: "visible", timeout: 30000 });
      firstVisible = "login";
    } else {
      // On authorize page — scroll down to reveal the accept button
      console.log("[e2e] On authorize page, scrolling to reveal button...");
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000);
      // Also try scrolling inside the modal
      const modal = page
        .locator('[class*="modal"], [class*="oauth2"], [role="dialog"]')
        .first();
      if (await modal.isVisible().catch(() => false)) {
        await modal.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "e2e/screenshots/discord-scrolled.png" });
      await authorizeBtn.waitFor({ state: "visible", timeout: 15000 });
      firstVisible = "authorize";
    }

    console.log("[e2e] Discord showed:", firstVisible);

    if (firstVisible === "login") {
      await emailInput.fill(discordEmail!);
      await page.locator('input[name="password"]').fill(discordPassword!);
      await page.locator('button[type="submit"]').click();
      console.log("[e2e] ✓ Submitted credentials");

      // Wait for authorize page or redirect
      const afterLogin = await Promise.race([
        authorizeBtn
          .waitFor({ state: "visible", timeout: 30000 })
          .then(() => "authorize" as const),
        page
          .waitForURL(/localhost:5000/, { timeout: 30000 })
          .then(() => "redirected" as const),
      ]);

      if (afterLogin === "authorize") {
        await page.screenshot({
          path: "e2e/screenshots/discord-authorize.png",
        });
        await authorizeBtn.click();
        console.log("[e2e] ✓ Clicked Authorize");
        await page.waitForURL(/localhost:5000/, { timeout: 30000 });
      }
    } else if (firstVisible === "authorize") {
      await page.screenshot({ path: "e2e/screenshots/discord-authorize.png" });
      await authorizeBtn.click();
      console.log("[e2e] ✓ Clicked Authorize");
      await page.waitForURL(/localhost:5000/, { timeout: 30000 });
    }
    // else: already redirected back

    console.log("[e2e] ✓ Back on app:", page.url());

    // 5. Wait for page to settle
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/final-page.png" });
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
