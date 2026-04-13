import path from "node:path";

import { devices, expect, test } from "@playwright/test";

import {
  createTestUser,
  injectSession,
  supabaseAdmin,
} from "./helpers/session";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../scripts/load-root-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);
loadRootEnv();

const { store: STORE_URL, payments: PAYMENTS_URL } = resolveE2EAppUrls();

test.use({
  ...devices["iPhone 12"],
  browserName: "chromium",
});

test("mobile layouts stay contained and checkout keeps the sidebar closed", async ({
  context,
  page,
}) => {
  const user = await createTestUser("mobile-layout");

  try {
    await injectSession(context, user);

    await page.goto(`${STORE_URL}/en`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId("nav-link-store")).toBeVisible();

    const storeViewportMetrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      body: document.body.scrollWidth,
    }));

    expect(storeViewportMetrics.doc).toBeLessThanOrEqual(
      storeViewportMetrics.viewport + 1,
    );
    expect(storeViewportMetrics.body).toBeLessThanOrEqual(
      storeViewportMetrics.viewport + 1,
    );

    await page.screenshot({
      path: "e2e/screenshots/mobile-store-layout.png",
      fullPage: true,
    });

    await page.getByTestId("product-card-link").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("product-detail-page")).toBeVisible();
    await expect(page.getByTestId("hero-section")).toBeVisible();

    const detailViewportMetrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      body: document.body.scrollWidth,
    }));

    expect(detailViewportMetrics.doc).toBeLessThanOrEqual(
      detailViewportMetrics.viewport + 1,
    );
    expect(detailViewportMetrics.body).toBeLessThanOrEqual(
      detailViewportMetrics.viewport + 1,
    );

    await page.screenshot({
      path: "e2e/screenshots/mobile-product-detail-layout.png",
      fullPage: true,
    });

    await page.getByTestId("product-detail-mobile-add-to-cart").click();
    await page.waitForTimeout(500);

    await page.goto(`${PAYMENTS_URL}/en/checkout`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByTestId("payments-mobile-sidebar-trigger"),
    ).toBeVisible();
    await expect(page.getByTestId("payments-sidebar")).not.toBeVisible();

    const checkoutViewportMetrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      body: document.body.scrollWidth,
    }));

    expect(checkoutViewportMetrics.doc).toBeLessThanOrEqual(
      checkoutViewportMetrics.viewport + 1,
    );
    expect(checkoutViewportMetrics.body).toBeLessThanOrEqual(
      checkoutViewportMetrics.viewport + 1,
    );

    await expect(page.getByTestId(/^seller-checkout-/).first()).toBeVisible();

    await page.getByTestId("payments-mobile-sidebar-trigger").click();
    await page.screenshot({
      path: "e2e/screenshots/mobile-payments-layout.png",
      fullPage: true,
    });
  } finally {
    await supabaseAdmin.auth.admin.deleteUser(user.userId);
  }
});
