import * as path from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { chromium, expect, test } from "@playwright/test";

/* eslint-disable @typescript-eslint/no-require-imports */
const { loadRootEnv } = require("../../../scripts/load-root-env.cjs");
const {
  getE2EExtraHTTPHeaders,
  resolveE2EAppUrls,
} = require("../../../scripts/app-url-resolver.js");
/* eslint-enable @typescript-eslint/no-require-imports */
loadRootEnv({ targetEnv: process.env.TARGET_ENV });

function loadLocalE2EEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalE2EEnv(path.resolve(__dirname, "../../../.env.local.e2e"));
const {
  auth: AUTH_URL,
  store: STORE_URL,
  admin: ADMIN_URL,
  playground: PLAYGROUND_URL,
  landing: LANDING_URL,
  payments: PAYMENTS_URL,
  studio: STUDIO_URL,
} = resolveE2EAppUrls();

// In staging, OAuth redirects go through the public tunnel URL, not localhost.
// Accept both the local container URL and the public NEXT_PUBLIC_AUTH_URL.
const PUBLIC_AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? AUTH_URL;
const PUBLIC_STORE_URL = process.env.NEXT_PUBLIC_STORE_URL ?? STORE_URL;
const PUBLIC_LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? LANDING_URL;
const PUBLIC_PAYMENTS_URL =
  process.env.NEXT_PUBLIC_PAYMENTS_URL ?? PAYMENTS_URL;
const PUBLIC_ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? ADMIN_URL;
const PUBLIC_STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? STUDIO_URL;
const PUBLIC_PLAYGROUND_URL =
  process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? PLAYGROUND_URL;

// When OAuth is used, the session cookie is on the public domain (tunnel).
// Use public URLs for cross-app checks so the session carries over.
const isOAuthEnv = PUBLIC_AUTH_URL !== AUTH_URL;

const IGNORABLE_REQUEST_FAILURE_PATTERNS = ["/cdn-cgi/rum?"];

const APP_CHECKS = [
  {
    name: "landing",
    url: `${isOAuthEnv ? PUBLIC_LANDING_URL : LANDING_URL}/en`,
    readyTestIds: ["hero-section"],
  },
  {
    name: "store",
    url: `${isOAuthEnv ? PUBLIC_STORE_URL : STORE_URL}/en`,
    readyTestIds: ["product-catalog-page"],
  },
  {
    name: "playground",
    url: `${isOAuthEnv ? PUBLIC_PLAYGROUND_URL : PLAYGROUND_URL}/en`,
    readyTestIds: ["playground-page"],
  },
  {
    name: "payments",
    url: `${isOAuthEnv ? PUBLIC_PAYMENTS_URL : PAYMENTS_URL}/en`,
    readyTestIds: ["payments-page", "access-denied"],
  },
  {
    name: "admin",
    url: `${isOAuthEnv ? PUBLIC_ADMIN_URL : ADMIN_URL}/en`,
    readyTestIds: ["admin-page", "access-denied"],
  },
  {
    name: "studio",
    url: `${isOAuthEnv ? PUBLIC_STUDIO_URL : STUDIO_URL}/en`,
    readyTestIds: ["product-list-page", "access-denied"],
  },
] as const;

async function clickFirstVisible(
  page: import("@playwright/test").Page,
  selectors: string[],
) {
  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click();
      return true;
    }
  }

  return false;
}

async function waitForAnyVisible(
  page: import("@playwright/test").Page,
  selectors: string[],
  timeout = 15000,
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    await page.waitForTimeout(500);
  }

  return null;
}

async function expectAuthenticatedAcrossApps(
  page: import("@playwright/test").Page,
) {
  for (const app of APP_CHECKS) {
    await page.goto(app.url);
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    await expect(
      page,
      `${app.name} should not bounce back to login`,
    ).not.toHaveURL(/\/login(\?|$)/);
    await expect(
      page.getByTestId("nav-user-email"),
      `${app.name} should keep the signed-in email visible`,
    ).not.toBeEmpty();

    const readyLocator = await waitForAnyVisible(
      page,
      app.readyTestIds.map((testId) => `[data-testid="${testId}"]`),
      10000,
    );
    expect(
      readyLocator,
      `${app.name} should render one of: ${app.readyTestIds.join(", ")}`,
    ).not.toBeNull();
  }
}

function shouldIgnoreRequestFailure(url: string) {
  return IGNORABLE_REQUEST_FAILURE_PATTERNS.some((pattern) =>
    url.includes(pattern),
  );
}

test("Google OAuth login flow", async () => {
  const googleEmail = process.env.GOOGLE_TEST_EMAIL;
  const googlePassword = process.env.GOOGLE_TEST_PASSWORD;

  test.skip(
    !googleEmail || !googlePassword,
    "GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD required",
  );

  test.setTimeout(120_000);

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: getE2EExtraHTTPHeaders(),
  });
  context.on("request", (request) => {
    if (request.url().includes("localhost")) {
      console.log(`[browser:request] ${request.method()} ${request.url()}`);
    }
  });
  context.on("requestfailed", (request) => {
    if (shouldIgnoreRequestFailure(request.url())) return;
    console.log(
      `[browser:requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
  const page = await context.newPage();
  page.on("console", (message) =>
    console.log(`[browser:${message.type()}] ${message.text()}`),
  );
  page.on("pageerror", (error) =>
    console.log(`[browser:error] ${error.message}`),
  );

  try {
    // Use the public URL for OAuth so the redirect_to parameter uses the
    // tunnel-accessible URL that Supabase's allowed redirect list accepts.
    const oauthStartUrl =
      PUBLIC_AUTH_URL !== AUTH_URL ? PUBLIC_AUTH_URL : AUTH_URL;
    await page.goto(`${oauthStartUrl}/en/login`);
    await expect(page.getByTestId("login-google")).toBeVisible();
    console.log("[e2e] Login page loaded");

    await page.waitForTimeout(1000);
    await page.getByTestId("login-google").click();
    console.log("[e2e] Clicked Google");

    let oauthPage = page;
    const popupPromise = page
      .waitForEvent("popup", { timeout: 10000 })
      .catch(() => null);
    const newPagePromise = context
      .waitForEvent("page", { timeout: 10000 })
      .catch(() => null);
    const navigated = await page
      .waitForURL((url) => url.hostname.includes("google"), { timeout: 10000 })
      .then(() => "same-tab")
      .catch(() => null);

    if (!navigated) {
      const popup = (await popupPromise) ?? (await newPagePromise);
      if (popup) {
        oauthPage = popup;
        await oauthPage.waitForLoadState("domcontentloaded");
      } else {
        await page.getByTestId("login-google").click();
        await page.waitForURL((url) => url.hostname.includes("google"), {
          timeout: 30000,
        });
      }
    }

    console.log("[e2e] Navigated to:", oauthPage.url());

    const emailChoice = oauthPage
      .locator(`[data-identifier="${googleEmail!}"]`)
      .first();
    if (await emailChoice.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailChoice.click();
      console.log("[e2e] Selected existing Google account");
    }

    const emailInput = oauthPage.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await emailInput.fill(googleEmail!);
      await clickFirstVisible(oauthPage, [
        "#identifierNext button",
        'button:has-text("Next")',
        'button:has-text("Siguiente")',
      ]);
      console.log("[e2e] Submitted email");
    }

    const passwordInput = await waitForAnyVisible(oauthPage, [
      'input[name="Passwd"]',
      'input[type="password"]',
      'input[aria-label*="password" i]',
      'input[aria-label*="contraseña" i]',
    ]);
    if (passwordInput) {
      await passwordInput.fill(googlePassword!);
      await clickFirstVisible(oauthPage, [
        "#passwordNext button",
        'div[role="button"]:has-text("Next")',
        'div[role="button"]:has-text("Siguiente")',
        'button:has-text("Next")',
        'button:has-text("Siguiente")',
      ]);
      console.log("[e2e] Submitted password");
    }

    await oauthPage.waitForTimeout(3000);
    await oauthPage.screenshot({
      path: "e2e/screenshots/google-after-processing.png",
    });

    await clickFirstVisible(oauthPage, [
      'button:has-text("Continue")',
      'button:has-text("Continuar")',
      'button:has-text("Allow")',
      'button:has-text("Permitir")',
      "#submit_approve_access",
      'button[data-idom-class*="primary"]',
    ]);

    await oauthPage.waitForURL(
      (url) =>
        url.href.startsWith(AUTH_URL) || url.href.startsWith(PUBLIC_AUTH_URL),
      { timeout: 45000 },
    );
    console.log("[e2e] Back on app:", oauthPage.url());

    await oauthPage.waitForLoadState("networkidle", { timeout: 15000 });
    await oauthPage.waitForTimeout(2000);
    await oauthPage.screenshot({ path: "e2e/screenshots/google-final.png" });

    const isAccountPage = await oauthPage
      .getByTestId("account-settings-page")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isAccountPage) {
      const cookies = await context.cookies();
      console.log(
        "[e2e] Cookies:",
        cookies.map((c) => c.name),
      );
      console.log("[e2e] URL:", oauthPage.url());
    }

    expect(isAccountPage, "Should show account page").toBe(true);
    await expect(oauthPage.getByTestId("profile-card")).toBeVisible();
    await expect(oauthPage.getByTestId("sign-out")).toBeVisible();
    await expectAuthenticatedAcrossApps(oauthPage);
    await oauthPage.screenshot({
      path: "e2e/screenshots/google-store-final.png",
    });
    console.log("[e2e] All passed");
  } finally {
    await context.close();
    await browser.close();
  }
});
