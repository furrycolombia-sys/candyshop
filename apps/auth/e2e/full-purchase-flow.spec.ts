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
 * Full purchase flow E2E test -- with screenshots at every step.
 *
 * Exercises the complete seller -> buyer -> approval lifecycle:
 * 1. Seller creates a product in Studio
 * 2. Seller configures a payment method in Payments
 * 3. Buyer finds the product in Store and adds to cart
 * 4. Buyer checks out via Payments
 * 5. Buyer verifies order is "Pending Verification"
 * 6. Seller approves the payment in Payments
 * 7. Buyer sees order is "Approved"
 *
 * Requires: supabase start + pnpm dev (all apps)
 */
test.describe.serial("Full purchase flow: seller -> buyer -> approval", () => {
  let seller: TestUser;
  let buyer: TestUser;

  test.beforeAll(async () => {
    resetCounter();
    seller = await createTestUser("seller", SELLER_PERMISSIONS);
    buyer = await createTestUser("buyer", BUYER_PERMISSIONS);
  });

  test.afterAll(async () => {
    if (seller && buyer) {
      await cleanupTestData(seller.userId, buyer.userId);
    }
  });

  // ─── Phase 1: Seller creates a product in Studio ───────────────

  test("Phase 1: seller creates a product in studio", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);

    // Navigate to studio
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await snap(page, "studio-product-list");

    // Click "New Product"
    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");
    await snap(page, "studio-new-product-empty");

    // Fill product name (EN)
    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField.click();
    await nameField.fill("E2E Test Product");
    await snap(page, "studio-product-name-filled");

    // Set price COP
    const priceField = page.getByTestId("inline-price-cop");
    await priceField.click();
    await priceField.fill("10000");
    await snap(page, "studio-product-price-filled");

    // Save (button says "CREATE")
    await page.getByTestId("toolbar-save").click();

    // Wait for redirect back to product list
    await page.waitForURL(`${APP_URLS.STUDIO}/en`, {
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    // Verify product appears in table
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-product-created");
  });

  // ─── Phase 2: Seller configures payment method in Payments ─────

  test("Phase 2: seller adds a payment method", async ({ context, page }) => {
    await injectSession(context, seller);

    // Navigate to payments app -- payment methods page
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await snap(page, "payments-methods-empty");

    // Click "Add Method"
    await page.getByTestId("add-payment-method-button").click();
    await snap(page, "payments-method-editor-open");

    // Select Bancolombia Transfer (requires receipt + transfer number)
    const typeSelect = page.getByTestId("payment-method-type-select");
    await typeSelect.waitFor({ state: "visible" });
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await typeSelect.selectOption({ label: "Bancolombia Transfer" });
    await snap(page, "payments-method-type-selected");

    // Fill account details (EN)
    await page
      .getByTestId("payment-method-account-en")
      .fill("E2E Bank Account 12345");
    await snap(page, "payments-method-details-filled");

    // Save
    await page.getByTestId("payment-method-save").click();

    // Wait for editor to close (indicates save succeeded)
    await expect(page.getByTestId("payment-method-save")).not.toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Verify method appears in the table
    await expect(page.getByTestId("payment-methods-page")).toBeVisible();
    await snap(page, "payments-method-saved");
  });

  // ─── Phase 3-4: Buyer browses store, adds to cart, checks out ──

  test("Phase 3-4: buyer finds product, adds to cart, and checks out", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    // Go to store catalog
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");
    await snap(page, "store-catalog");

    // Search for the seller's product
    await page.getByTestId("search-bar-input").fill("E2E Test");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, "store-search-results");

    // Click the first matching product card
    const productCard = page.getByTestId("product-card-link").first();
    await expect(productCard).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await productCard.click();

    // Wait for product detail page
    await page.waitForLoadState("networkidle");
    await snap(page, "store-product-detail");

    // Click "Add to Cart"
    await page.getByTestId("hero-add-to-cart").click();
    await snap(page, "store-added-to-cart");

    // Wait for add-to-cart animation to finish
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Open cart drawer (force click -- fly-to-cart animation can intercept)
    await page
      .getByTestId("cart-drawer-trigger")
      .first()
      .click({ force: true });

    // Verify item in cart
    await expect(page.getByTestId("cart-drawer-items")).toBeVisible();
    await expect(page.getByTestId("cart-item-name")).toBeVisible();
    await snap(page, "store-cart-open");

    // Click checkout -- navigates to payments app
    await page.getByTestId("cart-checkout").click();

    // Wait for payments checkout page
    await page.waitForURL(
      new RegExp(`${APP_URLS.PAYMENTS.replace("http://", "")}.*checkout`),
      {
        timeout: NAVIGATION_TIMEOUT_MS,
      },
    );

    // Wait for items and payment method to load
    await expect(page.getByTestId("checkout-items-summary")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "checkout-page-loaded");

    // Select payment method — wait until options are loaded (beyond placeholder)
    const methodSelect = page.getByTestId("payment-method-select").first();
    await methodSelect.waitFor({
      state: "visible",
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect
      .poll(
        async () => {
          const count = await methodSelect.evaluate(
            (el: HTMLSelectElement) => el.options.length,
          );
          return count;
        },
        { timeout: LONG_OPERATION_TIMEOUT_MS },
      )
      .toBeGreaterThan(1);
    const selectedValue = await methodSelect.inputValue();
    if (!selectedValue) {
      await methodSelect.selectOption({ index: 1 });
    }
    await snap(page, "checkout-method-selected");

    // Enter transfer number
    const transferInput = page.getByTestId(/^transfer-number-/).first();
    await transferInput.fill("TXN-E2E-12345");
    await snap(page, "checkout-transfer-filled");

    // Upload receipt photo (Bancolombia Transfer requires this)
    const receiptInput = page.getByTestId("receipt-file-input").first();
    await receiptInput.setInputFiles({
      name: "receipt-proof.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8BQz0AEYBxVOHIUAgBGWAgE/dLkRAAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, "checkout-receipt-uploaded");

    // Submit payment
    const submitBtn = page.getByTestId(/^submit-payment-/).first();
    await submitBtn.click();

    // Wait for success state
    await expect(page.getByTestId("checkout-all-submitted")).toBeVisible({
      timeout: LONG_OPERATION_TIMEOUT_MS,
    });
    await snap(page, "checkout-submitted");
  });

  // ─── Phase 5: Buyer verifies order status ─────────────────────

  test("Phase 5: buyer sees pending verification order", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // Verify order exists with "pending_verification" status
    await expect(
      page.getByTestId("order-status-pending_verification"),
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "buyer-order-pending");
  });

  // ─── Phase 6: Seller approves the payment ─────────────────────

  test("Phase 6: seller approves the order", async ({ context, page }) => {
    await injectSession(context, seller);

    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");

    // Find and click the approve button
    const approveBtn = page.getByTestId(/^order-approve-/).first();
    await expect(approveBtn).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "seller-order-received");

    // Click approve -- opens inline confirmation panel
    await approveBtn.click();
    await expect(page.getByTestId("confirm-action-panel")).toBeVisible();
    await snap(page, "seller-approve-confirmation");

    // Check the verification checkbox
    await page.getByTestId("confirm-checkbox").check();
    await snap(page, "seller-approve-checkbox-checked");

    // Click the irreversible confirm button
    await page.getByTestId("confirm-action-submit").click();

    // Wait for mutation to complete, then reload
    await page.waitForTimeout(BULK_MUTATION_WAIT_MS);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Approve button should be gone after approval
    await expect(page.getByTestId(/^order-approve-/).first()).not.toBeVisible({
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await snap(page, "seller-order-approved");
  });

  // ─── Phase 7: Buyer sees approval ─────────────────────────────

  test("Phase 7: buyer sees approved order", async ({ context, page }) => {
    await injectSession(context, buyer);

    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // Verify order shows approved status
    await expect(page.getByTestId("order-status-approved")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "buyer-order-approved");
  });
});
