/**
 * One-time setup: opens a real browser for you to log into Discord manually.
 * Saves the browser session to e2e/.auth/discord-session.json.
 * Subsequent E2E tests reuse this session.
 *
 * Run: pnpm exec playwright test setup-discord-session --headed
 */
import { test } from "@playwright/test";

test("Save Discord session (manual login)", async ({ browser }) => {
  test.setTimeout(120_000); // 2 minutes to log in manually

  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to Discord login
  await page.goto("https://discord.com/login");
  console.log("\n========================================");
  console.log("  Log into Discord manually in the browser.");
  console.log("  The test will save your session automatically.");
  console.log("  You have 2 minutes.");
  console.log("========================================\n");

  // Wait until user is logged in (Discord redirects to /channels after login)
  await page.waitForURL(/discord\.com\/(channels|app)/, { timeout: 120_000 });
  console.log("[setup] ✓ Discord login detected!");

  // Save the session
  await context.storageState({ path: "e2e/.auth/discord-session.json" });
  console.log("[setup] ✓ Session saved to e2e/.auth/discord-session.json");

  await context.close();
});
