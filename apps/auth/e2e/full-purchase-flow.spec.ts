import path from "node:path";

import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  APP_URLS,
  BULK_MUTATION_WAIT_MS,
  DEBOUNCE_WAIT_MS,
  ELEMENT_TIMEOUT_MS,
  LONG_OPERATION_TIMEOUT_MS,
  MUTATION_WAIT_MS,
  NAVIGATION_TIMEOUT_MS,
} from "./helpers/constants";
import {
  BUYER_PERMISSIONS,
  createTestUser,
  injectSession,
  SELLER_PERMISSIONS,
  type TestUser,
} from "./helpers/session";
import { createSnapHelper } from "./helpers/snap";

const { snap, resetCounter } = createSnapHelper(
  path.resolve(__dirname, "screenshots"),
);

/**
 * Full purchase flow E2E — two sellers, one buyer.
 *
 * Exercises the complete multi-seller lifecycle:
 * 1a. Seller A creates a product in Studio
 * 1b. Seller B creates a product in Studio
 * 2a. Seller A configures a payment method in Payments
 * 2b. Seller B configures a payment method in Payments
 * 3.  Buyer adds both products to cart and checks out
 *     → sees two separate seller checkout cards
 *     → fills each seller's form independently
 *     → submits both payments
 * 4.  Buyer verifies both orders are "Pending Verification"
 * 5a. Seller A approves their order
 * 5b. Seller B approves their order
 * 6.  Buyer sees both orders "Approved"
 *
 * Requires: supabase start + pnpm dev (all apps)
 */
test.describe.serial("Full purchase flow: two sellers, one buyer", () => {
  let sellerA: TestUser;
  let sellerB: TestUser;
  let buyer: TestUser;

  test.beforeAll(async () => {
    resetCounter();
    sellerA = await createTestUser("sellerA", SELLER_PERMISSIONS);
    sellerB = await createTestUser("sellerB", SELLER_PERMISSIONS);
    buyer = await createTestUser("buyer", BUYER_PERMISSIONS);
  });

  test.afterAll(async () => {
    if (sellerA) await cleanupTestData(sellerA.userId, buyer?.userId ?? "");
    if (sellerB)
      await cleanupTestData(sellerB.userId, buyer?.userId ?? "").catch(
        () => {},
      );
  });

  // ─── Helper: create a product in Studio ──────────────────────

  async function createProduct(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
    seller: TestUser,
    productName: string,
    price: string,
    snapPrefix: string,
  ) {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await snap(page, `${snapPrefix}-product-list`);

    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");

    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField.click();
    await nameField.fill(productName);

    const priceField = page.getByTestId("inline-price-cop");
    await priceField.click();
    await priceField.fill(price);
    await snap(page, `${snapPrefix}-product-filled`);

    await page.getByTestId("toolbar-save").click();
    await page.waitForURL(`${APP_URLS.STUDIO}/en`, {
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, `${snapPrefix}-product-created`);
  }

  // ─── Helper: create a payment method in Payments ─────────────

  async function createPaymentMethod(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
    seller: TestUser,
    methodName: string,
    instructions: string,
    fieldLabel: string,
    snapPrefix: string,
  ) {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    // New builder UX: "Add Method" instantly creates and expands inline
    await page.getByTestId("add-payment-method-button").click();

    // The editor is now expanded inline — fill the name
    const nameInput = page.getByTestId("payment-method-name-en");
    await nameInput.waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS });
    await nameInput.clear();
    await nameInput.fill(methodName);
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Add text display block with payment instructions
    await page.getByTestId("add-display-block").click();
    await page.getByTestId("add-block-type-text").click();
    const textarea = page
      .getByTestId("display-section-editor")
      .locator("textarea")
      .first();
    await textarea.fill(instructions);
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Add a required form field
    await page.getByTestId("add-form-field").click();
    const labelInput = page
      .getByTestId("form-section-editor")
      .locator("input[placeholder]")
      .first();
    await labelInput.fill(fieldLabel);
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${snapPrefix}-method-configured`);

    // No navigation needed — builder is inline on the list page
    await expect(page.getByTestId("payment-methods-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, `${snapPrefix}-method-saved`);
  }

  // ─── Phase 1a: Seller A creates a product ────────────────────

  test("Phase 1a: seller A creates a product in studio", async ({
    context,
    page,
  }) => {
    await createProduct(
      page,
      context,
      sellerA,
      "E2E Product Alpha",
      "15000",
      "sellerA",
    );
  });

  // ─── Phase 1b: Seller B creates a product ────────────────────

  test("Phase 1b: seller B creates a product in studio", async ({
    context,
    page,
  }) => {
    await createProduct(
      page,
      context,
      sellerB,
      "E2E Product Beta",
      "20000",
      "sellerB",
    );
  });

  // ─── Phase 2a: Seller A configures payment method ────────────

  test("Phase 2a: seller A adds a payment method", async ({
    context,
    page,
  }) => {
    await createPaymentMethod(
      page,
      context,
      sellerA,
      "Seller A — Nequi",
      "Send to Nequi: 300-111-2222 (Seller Alpha)",
      "Nequi Transfer Reference",
      "sellerA",
    );
  });

  // ─── Phase 2b: Seller B configures payment method ────────────

  test("Phase 2b: seller B adds a payment method", async ({
    context,
    page,
  }) => {
    await createPaymentMethod(
      page,
      context,
      sellerB,
      "Seller B — Bancolombia",
      "Transfer to Bancolombia: 123-456789-00 (Seller Beta)",
      "Bank Transfer Reference",
      "sellerB",
    );
  });

  // ─── Phase 3: Buyer adds both products and checks out ────────

  test("Phase 3: buyer adds both products to cart and checks out", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");
    await snap(page, "store-catalog");

    // ── Add Seller A's product ──────────────────────────────────
    await page.getByTestId("search-bar-input").fill("E2E Product Alpha");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, "store-search-alpha");

    const cardA = page.getByTestId("product-card-link").first();
    await expect(cardA).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await cardA.click();
    await page.waitForLoadState("networkidle");
    await snap(page, "store-product-alpha");

    await page.getByTestId("hero-add-to-cart").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "store-added-alpha");

    // ── Add Seller B's product ──────────────────────────────────
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("search-bar-input").fill("E2E Product Beta");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, "store-search-beta");

    const cardB = page.getByTestId("product-card-link").first();
    await expect(cardB).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await cardB.click();
    await page.waitForLoadState("networkidle");
    await snap(page, "store-product-beta");

    await page.getByTestId("hero-add-to-cart").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "store-added-beta");

    // ── Open cart and verify both items ────────────────────────
    await page
      .getByTestId("cart-drawer-trigger")
      .first()
      .click({ force: true });
    await expect(page.getByTestId("cart-drawer-items")).toBeVisible();

    // Should see two seller groups
    const sellerGroups = page.getByTestId("cart-seller-group");
    await expect(sellerGroups).toHaveCount(2, { timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "store-cart-two-sellers");

    // ── Checkout ────────────────────────────────────────────────
    await page.getByTestId("cart-checkout").click();
    await page.waitForURL(
      new RegExp(`${APP_URLS.PAYMENTS.replace("http://", "")}.*checkout`),
      { timeout: NAVIGATION_TIMEOUT_MS },
    );

    // Should see two seller checkout cards
    await expect(
      page.getByTestId("checkout-items-summary").first(),
    ).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "checkout-two-sellers-loaded");

    // Count only the outer card containers (not toggle buttons or status divs)
    const sellerCards = page.getByTestId(/^seller-checkout-[^t]/);
    await expect(sellerCards).toHaveCount(2, { timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "checkout-two-cards");

    // ── Fill and submit Seller A's payment ─────────────────────
    const cardASelect = page.getByTestId("payment-method-select").nth(0);
    await expect
      .poll(
        async () =>
          cardASelect.evaluate((el: HTMLSelectElement) => el.options.length),
        { timeout: LONG_OPERATION_TIMEOUT_MS },
      )
      .toBeGreaterThan(1);
    await cardASelect.selectOption({ index: 1 });
    await snap(page, "checkout-sellerA-method-selected");

    await expect(page.getByTestId(/^display-block-/).first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId(/^dynamic-field-/).first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page
      .getByTestId(/^dynamic-field-/)
      .first()
      .locator("input, textarea")
      .first()
      .fill("NEQUI-A-001");
    await snap(page, "checkout-sellerA-field-filled");

    await page
      .getByTestId(/^submit-payment-/)
      .first()
      .click();
    await snap(page, "checkout-sellerA-submitted");

    // ── Fill and submit Seller B's payment ─────────────────────
    // After Seller A submits, their card no longer has a select — Seller B's is now first
    const cardBSelect = page.getByTestId("payment-method-select").first();
    await expect
      .poll(
        async () =>
          cardBSelect.evaluate((el: HTMLSelectElement) => el.options.length),
        { timeout: LONG_OPERATION_TIMEOUT_MS },
      )
      .toBeGreaterThan(1);
    await cardBSelect.selectOption({ index: 1 });
    await snap(page, "checkout-sellerB-method-selected");

    await expect(page.getByTestId(/^dynamic-field-/).first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page
      .getByTestId(/^dynamic-field-/)
      .first()
      .locator("input, textarea")
      .first()
      .fill("BANCO-B-002");
    await snap(page, "checkout-sellerB-field-filled");

    await page
      .getByTestId(/^submit-payment-/)
      .first()
      .click();
    await snap(page, "checkout-sellerB-submitted");

    // ── Both submitted ──────────────────────────────────────────
    await expect(page.getByTestId("checkout-all-submitted")).toBeVisible({
      timeout: LONG_OPERATION_TIMEOUT_MS,
    });
    await snap(page, "checkout-all-submitted");
  });

  // ─── Phase 4: Buyer sees both orders pending ──────────────────

  test("Phase 4: buyer sees both orders pending verification", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    const pendingBadges = page.getByTestId("order-status-pending_verification");
    await expect(pendingBadges.first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(pendingBadges).toHaveCount(2, { timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "buyer-both-orders-pending");
  });

  // ─── Phase 5a: Seller A approves their order ──────────────────

  test("Phase 5a: seller A approves their order", async ({ context, page }) => {
    await injectSession(context, sellerA);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");

    const approveBtn = page.getByTestId(/^order-approve-/).first();
    await expect(approveBtn).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "sellerA-order-received");

    await approveBtn.click();
    await expect(page.getByTestId("confirm-action-panel")).toBeVisible();
    await page.getByTestId("confirm-checkbox").check();
    await page.getByTestId("confirm-action-submit").click();

    await page.waitForTimeout(BULK_MUTATION_WAIT_MS);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId(/^order-approve-/).first()).not.toBeVisible({
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await snap(page, "sellerA-order-approved");
  });

  // ─── Phase 5b: Seller B approves their order ──────────────────

  test("Phase 5b: seller B approves their order", async ({ context, page }) => {
    await injectSession(context, sellerB);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");

    const approveBtn = page.getByTestId(/^order-approve-/).first();
    await expect(approveBtn).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "sellerB-order-received");

    await approveBtn.click();
    await expect(page.getByTestId("confirm-action-panel")).toBeVisible();
    await page.getByTestId("confirm-checkbox").check();
    await page.getByTestId("confirm-action-submit").click();

    await page.waitForTimeout(BULK_MUTATION_WAIT_MS);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId(/^order-approve-/).first()).not.toBeVisible({
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await snap(page, "sellerB-order-approved");
  });

  // ─── Phase 6: Buyer sees both orders approved ─────────────────

  test("Phase 6: buyer sees both orders approved", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    const approvedBadges = page.getByTestId("order-status-approved");
    await expect(approvedBadges.first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(approvedBadges).toHaveCount(2, {
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "buyer-both-orders-approved");
  });
});
