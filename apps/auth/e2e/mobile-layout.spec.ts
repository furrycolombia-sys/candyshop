import path from "node:path";

import { devices, expect, test } from "@playwright/test";

import {
  adminDelete,
  adminInsert,
  createTestUser,
  SELLER_PERMISSIONS,
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
  const seller = await createTestUser("mobile-seller", SELLER_PERMISSIONS);
  const buyer = await createTestUser("mobile-buyer", [
    "products.read",
    "product_images.read",
    "orders.create",
    "orders.read",
    "receipts.create",
  ]);

  // Create a product so the store has something to display
  await adminInsert("products", {
    seller_id: seller.userId,
    slug: `mobile-test-${Date.now()}`,
    name_en: "Mobile Test Product",
    name_es: "Producto Mobile Test",
    description_en: "Product for mobile layout test",
    description_es: "Producto para test de layout mobile",
    type: "merch",
    category: "merch",
    price_cop: 5000,
    price_usd: 2,
    is_active: true,
    images: [],
    sections: [],
    tags: [],
    sort_order: 0,
    featured: false,
  });

  // Create a payment method so checkout has something to show
  await adminInsert("seller_payment_methods", {
    seller_id: seller.userId,
    name_en: "Mobile Test Method",
    name_es: "Metodo Mobile Test",
    display_blocks: [],
    form_fields: [],
    is_active: true,
    sort_order: 0,
  });

  try {
    await injectSession(context, buyer);

    // Verify session landed (not redirected to login)
    await page.goto(`${STORE_URL}/en`, { waitUntil: "networkidle" });
    expect(page.url(), "Store should not redirect to login").not.toContain(
      "/login",
    );
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

    // Verify we landed on checkout, not redirected to login
    expect(page.url(), "Checkout should not redirect to login").not.toContain(
      "/login",
    );

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
    // Cleanup test data
    await adminDelete(
      "seller_payment_methods",
      `seller_id=eq.${seller.userId}`,
    ).catch(() => {});
    await adminDelete("products", `seller_id=eq.${seller.userId}`).catch(
      () => {},
    );
    await adminDelete("user_permissions", `user_id=eq.${buyer.userId}`).catch(
      () => {},
    );
    await adminDelete("user_permissions", `user_id=eq.${seller.userId}`).catch(
      () => {},
    );
    await supabaseAdmin.auth.admin.deleteUser(buyer.userId).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(seller.userId).catch(() => {});
  }
});
