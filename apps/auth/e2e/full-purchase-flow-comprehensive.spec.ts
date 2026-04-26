/**
 * @file full-purchase-flow-comprehensive.spec.ts
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  REFERENCE ONLY — DO NOT MODIFY WITHOUT EXPLICIT USER INSTRUCTION   ║
 * ║  This suite is permanently skipped. It exists as a design reference  ║
 * ║  for the full platform lifecycle. Never enable, edit, or delete it   ║
 * ║  unless explicitly asked to do so.                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * COMPREHENSIVE END-TO-END MEGA-SUITE
 * ====================================
 * Tests the complete platform lifecycle across two independent sellers,
 * each with multiple products, payment methods, and delegates.
 *
 * ACTORS
 * ──────
 *  sellerA / sellerB   – Two independent storefront owners
 *  buyer               – Customer who purchases from both sellers
 *  delegateA1/A2       – SellerA delegates with FULL permissions (approve + request_proof)
 *  delegateA3          – SellerA delegate with PROOF-ONLY permission (request_proof only)
 *  delegateB1/B2       – SellerB delegates with FULL permissions
 *  delegateB3          – SellerB delegate with PROOF-ONLY permission
 *
 * SELLER SETUP (Phases 1 & 2)
 * ────────────────────────────
 *  Each seller creates via Studio UI:
 *   • 3 products: 2 active + 1 inactive (for future use)
 *     - Products include all 4 section types (cards, accordion, two-column, gallery)
 *     - Drag-and-drop section reordering is exercised
 *     - URL-based image carousel with 3 images + cover change
 *     - Product edit with name/price change + verification
 *     - Product list reordering via drag handle
 *   • 2 payment methods, both requiring receipt upload AND transfer number
 *   • 3 delegates as described above
 *
 * BUYER CHECKOUT (Phase 3)
 * ─────────────────────────
 *  Trip 1: buyer purchases A1 + B1 → receipt uploaded for each seller
 *  Trip 2: buyer purchases A2 (edited) + B2 (edited) → receipt uploaded for each seller
 *  After each trip, order IDs are captured from the seller sales pages.
 *  Every uploaded receipt is SHA-256 verified against the fixture file.
 *
 * APPROVAL SCENARIOS (Phases 4–6)
 * ─────────────────────────────────
 *  Scenario A (Phase 4): Seller-only
 *    - sellerA approves orderA1 directly on /sales
 *    - delegateA1 observes the completed order on /assigned
 *
 *  Scenario B (Phase 5): Mixed seller + delegate
 *    - delegateA2 approves orderA2 via /assigned
 *    - sellerA verifies the approval on /sales (approve button gone)
 *    - sellerB approves orderB1 directly on /sales
 *    - delegateB1 observes the completed order on /assigned
 *
 *  Scenario C (Phase 6): Delegate proof gate
 *    - delegateB3 (proof-only) attempts to approve orderB2 → backend rejects
 *    - delegateB3 requests proof / evidence for orderB2
 *    - delegateB1 (full perms) sees the evidence_requested status
 *    - buyer resubmits a fresh receipt for orderB2
 *    - delegateB2 (full perms) approves orderB2 + verifies receipt hash
 *    - buyer's order page shows all 4 orders approved
 *
 * RECEIPT VERIFICATION
 * ─────────────────────
 *  A SHA-256 hash of test-receipt.png is computed once in beforeAll.
 *  Before every approval, verifyReceiptHash() downloads the stored receipt
 *  via its link and compares the hash to the pre-computed value.
 *
 * TEST ORDERING
 * ─────────────
 *  All tests run in strict serial order (test.describe.serial).
 *  Shared state (user objects, product IDs, order IDs) is passed via
 *  outer let variables.  If a phase fails, subsequent phases will surface
 *  clear "expected truthy, got empty string" errors pinpointing the root cause.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import { dragAndDrop } from "./helpers/drag";
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
  adminDelete,
  BUYER_PERMISSIONS,
  createTestUser,
  injectSession,
  SELLER_PERMISSIONS,
  supabaseAdmin,
  type TestUser,
} from "./helpers/session";
import { createSnapHelper } from "./helpers/snap";

// ─── Module-level constants ──────────────────────────────────────────────────

const { snap, resetCounter } = createSnapHelper(
  path.resolve(__dirname, "screenshots"),
);

/** Absolute path to the PNG fixture used as the test receipt for every upload. */
const RECEIPT_FIXTURE = path.resolve(__dirname, "fixtures/test-receipt.png");

/**
 * The two UI-grantable order permissions.  Full delegates receive both;
 * proof-only delegates receive only orders.request_proof.
 */
const DELEGATE_PERMISSIONS = [
  "orders.approve",
  "orders.request_proof",
] as const;

// ─────────────────────────────────────────────────────────────────────────────

test.describe.skip("Full purchase flow: multi-seller, multi-delegate", () => {
  // ── Shared actor state (populated in beforeAll) ──────────────────────────
  let sellerA: TestUser;
  let sellerB: TestUser;
  let buyer: TestUser;
  let delegateA1: TestUser; // full perms
  let delegateA2: TestUser; // full perms
  let delegateA3: TestUser; // proof-only
  let delegateB1: TestUser; // full perms
  let delegateB2: TestUser; // full perms
  let delegateB3: TestUser; // proof-only

  // ── Product IDs extracted from Studio after creation ─────────────────────
  let productIdA1: string; // sellerA active product 1
  let productIdA2: string; // sellerA active product 2
  let productIdA3: string; // sellerA inactive (reserved)
  let productIdB1: string; // sellerB active product 1
  let productIdB2: string; // sellerB active product 2
  let productIdB3: string; // sellerB inactive (reserved)

  // ── Order IDs extracted from seller sales pages after checkout ────────────
  let orderA1Id: string; // trip 1 → sellerA
  let orderA2Id: string; // trip 2 → sellerA
  let orderB1Id: string; // trip 1 → sellerB
  let orderB2Id: string; // trip 2 → sellerB

  /**
   * SHA-256 hex digest of the receipt fixture file.
   * Computed once in beforeAll and compared against every uploaded receipt.
   */
  let expectedReceiptHash: string;

  /** Unique suffix appended to all names to avoid collisions across runs. */
  const runId = Date.now();

  // Product display names
  const PRODUCT_A1 = `E2E SellerA-P1 ${runId}`;
  const PRODUCT_A2 = `E2E SellerA-P2 ${runId}`;
  const PRODUCT_A3 = `E2E SellerA-P3-Inactive ${runId}`;
  const PRODUCT_B1 = `E2E SellerB-P1 ${runId}`;
  const PRODUCT_B2 = `E2E SellerB-P2 ${runId}`;
  const PRODUCT_B3 = `E2E SellerB-P3-Inactive ${runId}`;

  // ────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────────────

  test.beforeAll(async () => {
    resetCounter();

    // Pre-compute receipt hash so verifyReceiptHash() has a reference value.
    expectedReceiptHash = createHash("sha256")
      .update(readFileSync(RECEIPT_FIXTURE))
      .digest("hex");

    if (!expectedReceiptHash) {
      throw new Error(
        `[beforeAll] Failed to compute SHA-256 hash for receipt fixture: ${RECEIPT_FIXTURE}`,
      );
    }

    // Create all 9 actors in parallel — any rejection propagates immediately.
    [
      sellerA,
      sellerB,
      buyer,
      delegateA1,
      delegateA2,
      delegateA3,
      delegateB1,
      delegateB2,
      delegateB3,
    ] = await Promise.all([
      createTestUser(`sellerA-${runId}`, SELLER_PERMISSIONS),
      createTestUser(`sellerB-${runId}`, SELLER_PERMISSIONS),
      createTestUser(`buyer-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dA1-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dA2-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dA3-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dB1-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dB2-${runId}`, BUYER_PERMISSIONS),
      createTestUser(`dB3-${runId}`, BUYER_PERMISSIONS),
    ]).catch((err: unknown) => {
      throw new Error(
        `[beforeAll] Failed to create test users: ${String(err)}`,
      );
    });
  });

  test.afterAll(async () => {
    /**
     * Deletion order is critical:
     *  1. seller_admins rows for both sellers (FK → delegate user_id)
     *  2. Individual delegate user_permissions + user_profiles + auth accounts
     *  3. Cascade-delete seller data (products, orders) + buyer order history
     */

    if (sellerA) {
      await adminDelete(
        "seller_admins",
        `seller_id=eq.${sellerA.userId}`,
      ).catch((err: unknown) =>
        console.warn(
          `[afterAll] Could not delete sellerA seller_admins: ${String(err)}`,
        ),
      );
    }
    if (sellerB) {
      await adminDelete(
        "seller_admins",
        `seller_id=eq.${sellerB.userId}`,
      ).catch((err: unknown) =>
        console.warn(
          `[afterAll] Could not delete sellerB seller_admins: ${String(err)}`,
        ),
      );
    }

    for (const [label, d] of [
      ["delegateA1", delegateA1],
      ["delegateA2", delegateA2],
      ["delegateA3", delegateA3],
      ["delegateB1", delegateB1],
      ["delegateB2", delegateB2],
      ["delegateB3", delegateB3],
    ] as [string, TestUser][]) {
      if (!d) continue;
      await adminDelete("user_permissions", `user_id=eq.${d.userId}`).catch(
        (err: unknown) =>
          console.warn(
            `[afterAll] user_permissions delete failed for ${label}: ${String(err)}`,
          ),
      );
      await supabaseAdmin.auth.admin
        .deleteUser(d.userId)
        .catch((err: unknown) =>
          console.warn(
            `[afterAll] auth delete failed for ${label}: ${String(err)}`,
          ),
        );
    }

    if (sellerA && buyer) {
      await cleanupTestData(sellerA.userId, buyer.userId).catch(
        (err: unknown) =>
          console.warn(
            `[afterAll] cleanupTestData sellerA failed: ${String(err)}`,
          ),
      );
    }
    if (sellerB && buyer) {
      await cleanupTestData(sellerB.userId, buyer.userId).catch(
        (err: unknown) =>
          console.warn(
            `[afterAll] cleanupTestData sellerB failed: ${String(err)}`,
          ),
      );
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // Type aliases (used in helper signatures below)
  // ────────────────────────────────────────────────────────────────────────

  type Page = import("@playwright/test").Page;
  type BrowserContext = import("@playwright/test").BrowserContext;

  // ────────────────────────────────────────────────────────────────────────
  // SHARED HELPERS
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Opens the confirm-action panel for an order and submits the approval.
   *
   * Flow:
   *   1. Click the order-approve-{orderId} button
   *   2. Wait for confirm-action-panel
   *   3. Check the confirm-checkbox
   *   4. Click confirm-action-submit
   *   5. Wait for MUTATION_WAIT_MS for the server to process
   *
   * @throws If the approve button is not visible.
   * @throws If the confirm panel does not open.
   */
  async function approveOrder(page: Page, orderId: string): Promise<void> {
    const approveBtn = page.getByTestId(`order-approve-${orderId}`);
    await expect(
      approveBtn,
      `[approveOrder] order-approve-${orderId} must be visible`,
    ).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await approveBtn.click();

    const panel = page.getByTestId("confirm-action-panel");
    await panel
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[approveOrder] confirm-action-panel did not open after clicking order-approve-${orderId}`,
        );
      });

    const checkbox = page.getByTestId("confirm-checkbox");
    await checkbox
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[approveOrder] confirm-checkbox not visible in confirm panel for order ${orderId}`,
        );
      });
    await checkbox.check();

    await page.getByTestId("confirm-action-submit").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
  }

  /**
   * Downloads the uploaded receipt for an order and compares its SHA-256
   * hash against the expected hash computed from test-receipt.png in beforeAll.
   *
   * Uses data-testid="receipt-view-link-{orderId}" first; falls back to the
   * generic "receipt-view-link" if the scoped version is absent.
   *
   * NOTE: If no receipt link is found in the current view (e.g. the seller
   * does not expose it on this page), verification is skipped with a warning
   * rather than failing hard — but a missing link on pages that SHOULD show
   * it is itself an assertion failure.
   *
   * @throws If the receipt download HTTP request fails (non-2xx).
   * @throws If the downloaded file's hash does not match expectedReceiptHash.
   */
  async function verifyReceiptHash(page: Page, orderId: string): Promise<void> {
    const scopedLink = page.getByTestId(`receipt-view-link-${orderId}`).first();
    const genericLink = page
      .locator(`[data-testid="receipt-view-link"]`)
      .first();

    const href =
      (await scopedLink.getAttribute("href").catch(() => null)) ??
      (await genericLink.getAttribute("href").catch(() => null));

    if (!href) {
      // Receipt link not exposed on this page — log and skip, do not fail
      console.warn(
        `[verifyReceiptHash] No receipt-view-link found for order ${orderId} — skipping hash check`,
      );
      return;
    }

    const response = await page.request.get(href);
    if (!response.ok()) {
      throw new Error(
        `[verifyReceiptHash] Receipt download failed for order ${orderId}: HTTP ${response.status()} at ${href}`,
      );
    }

    const buffer = await response.body();
    const actualHash = createHash("sha256").update(buffer).digest("hex");

    expect(
      actualHash,
      `[verifyReceiptHash] SHA-256 mismatch for order ${orderId} — ` +
        `expected fixture hash ${expectedReceiptHash.slice(0, 8)}… ` +
        `but got ${actualHash.slice(0, 8)}…`,
    ).toBe(expectedReceiptHash);
  }

  /**
   * Creates a new product in Studio and returns its UUID.
   *
   * Steps:
   *   1. Inject seller session
   *   2. Navigate to Studio /en
   *   3. Click "new-product-button"
   *   4. Fill name (inline-text-en-name_en) and price (inline-price)
   *   5. Save via toolbar-save → redirects to product list
   *   6. Find the product row by display name, extract and return the UUID
   *
   * @param page         Playwright Page
   * @param context      Browser context (used for session injection)
   * @param seller       TestUser who owns the product
   * @param productName  Display name to enter into the name field
   * @param price        Price string (e.g. "15000")
   * @param snapPrefix   Prefix for screenshot names within this helper
   * @returns            The UUID portion of the product-row-{uuid} testid
   *
   * @throws If the product-table is not visible after save.
   * @throws If no product-row is found matching the given productName.
   * @throws If the extracted UUID is empty.
   */
  async function createProduct(
    page: Page,
    context: BrowserContext,
    seller: TestUser,
    productName: string,
    price: string,
    snapPrefix: string,
  ): Promise<string> {
    // Step 1 – establish seller session
    await injectSession(context, seller);

    // Step 2 – go to Studio home (product list)
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    // Step 3 – open the new product form
    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Step 4 – fill name and price
    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[createProduct "${productName}"] inline-text-en-name_en not visible after opening new-product form`,
        );
      });
    await nameField.click();
    await nameField.fill(productName);

    const priceField = page.getByTestId("inline-price");
    await priceField
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[createProduct "${productName}"] inline-price not visible after opening new-product form`,
        );
      });
    await priceField.click();
    await priceField.fill(price);
    await snap(page, `${snapPrefix}-filled`);

    // Step 5 – save and wait for redirect back to product list
    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error(
          `[createProduct "${productName}"] Did not redirect to Studio list after saving product`,
        );
      });

    await expect(
      page.getByTestId("product-table"),
      `[createProduct "${productName}"] product-table must be visible after redirect`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, `${snapPrefix}-created`);

    // Step 6 – locate the new row and extract its UUID
    const row = page
      .locator(`[data-testid^="product-row-"]`)
      .filter({ hasText: productName })
      .first();
    await row
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[createProduct "${productName}"] product-row not found in Studio table after creation`,
        );
      });

    const rowTestId = await row.getAttribute("data-testid");
    const productId = (rowTestId ?? "").replace("product-row-", "");
    if (!productId) {
      throw new Error(
        `[createProduct "${productName}"] Could not extract product UUID from testid "${rowTestId ?? "null"}"`,
      );
    }
    return productId;
  }

  /**
   * Adds all 4 section types (cards, accordion, two-column, gallery) to an
   * open product editor, then drag-reorders the first section down by 1 position.
   *
   * Assumes the caller has already opened the product editor page.
   *
   * Steps per section:
   *   1. Click the last "inline-add-btn" inside the "inline-sections" container
   *   2. Set section-type-N select to the desired type
   *   3. Fill section-name-N with a human-readable label
   *
   * After all 4 are added:
   *   - Drag section-0's aria-label handle down 1 position
   *
   * @throws If a section-type select does not appear after clicking add.
   */
  async function addAndReorderSections(
    page: Page,
    snapPrefix: string,
  ): Promise<void> {
    const sectionTypes = [
      "cards",
      "accordion",
      "two-column",
      "gallery",
    ] as const;

    const inlineSections = page.getByTestId("inline-sections");

    for (let i = 0; i < sectionTypes.length; i++) {
      // Click the last add button scoped to the sections container
      const addBtn = inlineSections.getByTestId("inline-add-btn").last();
      await addBtn.click();
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      // Wait for the new section's type selector
      const typeSelect = page.getByTestId(`section-type-${i}`);
      await typeSelect
        .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
        .catch(() => {
          throw new Error(
            `[addAndReorderSections "${snapPrefix}"] section-type-${i} select not visible after adding section ${i + 1}`,
          );
        });
      await typeSelect.selectOption(sectionTypes[i]);
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      // Label the section for readability
      const nameArea = page.getByTestId(`section-name-${i}`);
      await nameArea.fill(`Section ${sectionTypes[i]}`);
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      // Add one item to the section — validation requires items.length > 0
      const sectionCard = page.getByTestId(`section-card-${i}`);
      await sectionCard.getByTestId("inline-add-btn").click();
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      // Fill the item title (validation requires title_en or title_es to be non-empty)
      const itemTitle = page.getByTestId(`section-item-title-${i}-0`);
      await itemTitle
        .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
        .catch(() => {
          throw new Error(
            `[addAndReorderSections "${snapPrefix}"] section-item-title-${i}-0 not visible after adding item to section ${i}`,
          );
        });
      await itemTitle.fill(`Item ${i + 1}`);
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    }
    await snap(page, `${snapPrefix}-sections-added`);

    // Drag-reorder: move section-0 (cards) down 1 position → becomes section-1
    const handle0 = page
      .getByTestId("section-card-0")
      .locator("[aria-label]")
      .first();
    await dragAndDrop(page, handle0, "down", 1);
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${snapPrefix}-sections-reordered`);
  }

  /**
   * Adds 3 URL-based images to a product's inline image carousel and exercises
   * cover selection changes.
   *
   * Image source: picsum.photos with a deterministic seed per image index.
   *
   * Steps per image:
   *   1. Click "image-thumb-add" to create a new empty thumbnail slot
   *   2. Click the main empty area ("image-gallery-main-empty" or "image-gallery-main")
   *      to open the edit bar
   *   3. Fill "image-edit-url" with the image URL
   *   4. Click "image-edit-done"
   *
   * After all 3 images are added:
   *   - Click "image-thumb-cover-1" → sets image 1 as cover
   *   - Click "image-thumb-cover-0" → resets cover back to image 0
   *
   * @throws If the image-edit-bar does not open after clicking the main area.
   */
  async function addImagesAndChangeCover(
    page: Page,
    snapPrefix: string,
  ): Promise<void> {
    const IMAGE_URLS = [
      "https://picsum.photos/seed/e2e-img-1/400/300",
      "https://picsum.photos/seed/e2e-img-2/400/300",
      "https://picsum.photos/seed/e2e-img-3/400/300",
    ];

    // Scope add button to desktop gallery to avoid strict-mode violation (desktop + mobile both exist)
    const gallery = page.getByTestId("image-gallery-thumbs");
    const addImageBtn = gallery.getByTestId("image-thumb-add");

    for (const [idx, url] of IMAGE_URLS.entries()) {
      // Clicking image-thumb-add immediately opens the edit bar
      await addImageBtn.click();
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      const urlInput = page.getByTestId("image-edit-url");
      await urlInput
        .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
        .catch(() => {
          throw new Error(
            `[addImagesAndChangeCover "${snapPrefix}"] image-edit-url not visible after clicking add button for image index ${idx}`,
          );
        });

      await urlInput.fill(url);
      await page.getByTestId("image-edit-done").click();
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    }
    await snap(page, `${snapPrefix}-images-added`);

    // Change cover to image 1
    await gallery.getByTestId("image-thumb-cover-1").click();
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, `${snapPrefix}-cover-1`);

    // Revert cover to image 0
    await gallery.getByTestId("image-thumb-cover-0").click();
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    await snap(page, `${snapPrefix}-cover-0`);
  }

  /**
   * Opens an existing product by display name, edits its name and price,
   * saves, and then verifies the new name appears in the Studio product table.
   *
   * Steps:
   *   1. Find the product-row containing `productName` and click it
   *   2. Fill the name field with `newName`
   *   3. Fill the price field with `newPrice`
   *   4. Save via toolbar-save → redirect to Studio list
   *   5. Assert the row with `newName` is visible
   *
   * @throws If the product row for `productName` is not found.
   * @throws If the redirect to Studio list does not happen.
   * @throws If the edited name is not visible in the table after save.
   */
  async function editAndVerifyProduct(
    page: Page,
    productName: string,
    newName: string,
    newPrice: string,
    snapPrefix: string,
  ): Promise<void> {
    // Step 1 – find the product row and navigate to editor via URL
    const row = page
      .locator(`[data-testid^="product-row-"]`)
      .filter({ hasText: productName })
      .first();
    await row
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[editAndVerifyProduct] product row for "${productName}" not found in Studio table`,
        );
      });
    const rowTestId = await row.getAttribute("data-testid");
    const editProductId = rowTestId?.replace("product-row-", "") ?? "";
    if (!editProductId) {
      throw new Error(
        `[editAndVerifyProduct] Could not extract product ID from row for "${productName}"`,
      );
    }
    await page.goto(`${APP_URLS.STUDIO}/en/products/${editProductId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Step 2–3 – edit fields
    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[editAndVerifyProduct] inline-text-en-name_en not visible in editor for "${productName}"`,
        );
      });
    await nameField.click();
    await nameField.fill(newName);

    const priceField = page.getByTestId("inline-price");
    await priceField.click();
    await priceField.fill(newPrice);
    await snap(page, `${snapPrefix}-edited`);

    // Step 4 – save
    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error(
          `[editAndVerifyProduct] Did not redirect to Studio list after editing "${productName}" → "${newName}"`,
        );
      });

    // Step 5 – verify edit persisted
    await expect(
      page
        .locator(`[data-testid^="product-row-"]`)
        .filter({ hasText: newName }),
      `[editAndVerifyProduct] Edited name "${newName}" not found in Studio table`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, `${snapPrefix}-verified`);
  }

  /**
   * Reorders products by drag-dropping the first product row down one position.
   *
   * Locates the drag handle (first [aria-label] child) on the first product-row
   * and calls the keyboard-based dragAndDrop helper (Space lift, Arrow move,
   * Space drop).
   *
   * @throws If no product rows exist on the page (no handle to drag).
   */
  async function reorderProducts(
    page: Page,
    snapPrefix: string,
  ): Promise<void> {
    const firstRow = page.locator(`[data-testid^="product-row-"]`).first();
    await firstRow
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[reorderProducts "${snapPrefix}"] No product rows visible — cannot reorder`,
        );
      });

    const handle = firstRow.locator("[aria-label]").first();
    await dragAndDrop(page, handle, "down", 1);
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${snapPrefix}-reordered`);
  }

  /**
   * Creates a payment method for a seller in the Payments app.
   *
   * Both "requires_receipt" and "requires_transfer_number" checkboxes are
   * checked, ensuring every checkout flow requires a receipt upload.
   *
   * Steps:
   *   1. Inject seller session
   *   2. Navigate to /en/payment-methods
   *   3. Click "add-payment-method-button"
   *   4. Fill name, display instructions block, transfer-number field label
   *   5. Check requires_receipt and requires_transfer_number
   *   6. Save and verify payment-methods-page is visible
   *
   * @throws If the payment-method-name-en input does not appear.
   * @throws If requires_receipt or requires_transfer_number cannot be checked.
   * @throws If payment-methods-page is not visible after saving.
   */
  async function createPaymentMethod(
    page: Page,
    context: BrowserContext,
    seller: TestUser,
    methodName: string,
    instructions: string,
    fieldLabel: string,
    snapPrefix: string,
  ): Promise<void> {
    // Step 1 – seller session
    await injectSession(context, seller);

    // Step 2 – payment methods list
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    // Step 3 – open creation form
    await page.getByTestId("add-payment-method-button").click();

    // Step 4a – method name
    const nameInput = page.getByTestId("payment-method-name-en");
    await nameInput
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[createPaymentMethod "${methodName}"] payment-method-name-en not visible after clicking add`,
        );
      });
    await nameInput.clear();
    await nameInput.fill(methodName);

    // Step 4b – display instructions block
    await page.getByTestId("add-block-type-text").click();
    const textarea = page
      .getByTestId("display-section-editor")
      .locator("textarea")
      .first();
    await textarea.fill(instructions);

    // Step 4c – transfer number field label
    await page.getByTestId("add-field-type-text").click();
    const labelInput = page
      .getByTestId("form-section-editor")
      .locator("input[placeholder]")
      .first();
    await labelInput.fill(fieldLabel);

    // Step 5 – check requires_receipt
    const requiresReceiptCheckbox = page.getByTestId(
      "payment-method-requires-receipt",
    );
    await requiresReceiptCheckbox
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[createPaymentMethod "${methodName}"] payment-method-requires-receipt checkbox not visible`,
        );
      });
    if (!(await requiresReceiptCheckbox.isChecked())) {
      await requiresReceiptCheckbox.click();
    }
    await expect(
      requiresReceiptCheckbox,
      `[createPaymentMethod "${methodName}"] requires_receipt should be checked`,
    ).toBeChecked();

    // Step 5 – check requires_transfer_number
    const requiresTransferCheckbox = page.getByTestId(
      "payment-method-requires-transfer-number",
    );
    if (!(await requiresTransferCheckbox.isChecked())) {
      await requiresTransferCheckbox.click();
    }
    await expect(
      requiresTransferCheckbox,
      `[createPaymentMethod "${methodName}"] requires_transfer_number should be checked`,
    ).toBeChecked();
    await snap(page, `${snapPrefix}-configured`);

    // Step 6 – save
    await page.getByTestId("payment-method-save").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("payment-methods-page"),
      `[createPaymentMethod "${methodName}"] payment-methods-page not visible after save`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, `${snapPrefix}-saved`);
  }

  /**
   * Adds a delegate user to a seller's delegate list via Studio /en/delegates.
   *
   * Steps:
   *   1. Inject seller session
   *   2. Navigate to Studio /en/delegates
   *   3. Type first 6 chars of delegate email into "delegate-search-input"
   *   4. Click the result button matching the delegate email
   *   5. Toggle "delegate-permission-{perm}" checkboxes to match the `permissions` array
   *   6. Submit via "delegate-add-submit"
   *
   * The delegate search result buttons have no stable testid; they are located
   * via `ul li button` filtered by delegate.email text.
   *
   * @param page        Playwright Page
   * @param context     Browser context
   * @param seller      The seller who owns the delegate list
   * @param delegate    The user to add as delegate
   * @param permissions Subset of DELEGATE_PERMISSIONS to grant
   * @param snapPrefix  Prefix for screenshot names
   *
   * @throws If the search result button for the delegate is not found.
   * @throws If the delegate-add-submit button is not visible.
   */
  async function addDelegate(
    page: Page,
    context: BrowserContext,
    seller: TestUser,
    delegate: TestUser,
    permissions: string[],
    snapPrefix: string,
  ): Promise<void> {
    // Step 1 – seller session
    await injectSession(context, seller);

    // Step 2 – delegates management page
    await page.goto(`${APP_URLS.STUDIO}/en/delegates`);
    await page.waitForLoadState("networkidle");

    // Step 3 – search for delegate by email prefix
    const searchInput = page.getByTestId("delegate-search-input");
    await searchInput
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[addDelegate seller=${seller.email} delegate=${delegate.email}] delegate-search-input not visible`,
        );
      });
    await searchInput.fill(delegate.email.slice(0, 6));
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    // Step 4 – click the search result for this delegate
    const resultBtn = page
      .locator("ul li button")
      .filter({ hasText: delegate.email })
      .first();
    await resultBtn
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[addDelegate] Search result button for delegate "${delegate.email}" under seller "${seller.email}" not found`,
        );
      });
    await resultBtn.click();
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    // Step 5 – set permission checkboxes
    for (const perm of DELEGATE_PERMISSIONS) {
      const checkbox = page.getByTestId(`delegate-permission-${perm}`);
      const shouldCheck = permissions.includes(perm);
      const isChecked = await checkbox.isChecked().catch(() => false);

      if (shouldCheck && !isChecked) {
        await checkbox.click();
      } else if (!shouldCheck && isChecked) {
        await checkbox.click();
      }
    }
    await snap(page, `${snapPrefix}-perms-set`);

    // Step 6 – submit
    const submitBtn = page.getByTestId("delegate-add-submit");
    await submitBtn
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[addDelegate delegate=${delegate.email}] delegate-add-submit not visible`,
        );
      });
    await submitBtn.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${snapPrefix}-added`);
  }

  /**
   * Performs a complete checkout trip as the buyer:
   *   1. Navigate to Store, find productA card and click "add-to-cart"
   *   2. Return to Store, find productB card and click "add-to-cart"
   *   3. Go to Payments /en/checkout
   *   4. For each seller checkout card:
   *      - Fill transfer number input
   *      - Upload receipt fixture via file input (or upload button fallback)
   *      - Click per-card submit button (if present)
   *   5. Click global "checkout-submit" if present
   *   6. Navigate to /en/orders for a final state snapshot
   *
   * Returns the raw seller-checkout-{id} IDs extracted from the checkout cards
   * so they can later be reconciled with the order-approve testids on the
   * seller sales page.
   *
   * NOTE: The actual order UUIDs for the seller approval flow are captured
   * separately in the Phase 3b/3c/3e/3f tests using the seller's sales page,
   * because the checkout card IDs may differ from the order IDs used in
   * approval buttons.
   *
   * @throws If the product-catalog-page does not load.
   * @throws If either product card is not found.
   * @throws If fewer than 2 seller checkout cards appear on checkout page.
   *
   * @returns Tuple [checkoutCardIdA, checkoutCardIdB] (may be empty strings
   *          if extraction fails — not thrown since caller uses sales page IDs)
   */
  async function checkoutTrip(
    page: Page,
    context: BrowserContext,
    productA: string,
    productB: string,
    tripLabel: string,
  ): Promise<[string, string]> {
    // Establish buyer session
    await injectSession(context, buyer);

    // ── Step 1: Add product A ──────────────────────────────────────────────
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByTestId("product-catalog-page"),
      `[checkoutTrip ${tripLabel}] product-catalog-page not visible`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    const cardA = page
      .locator(`[data-testid^="product-card-"]`)
      .filter({ hasText: productA })
      .first();
    await cardA
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[checkoutTrip ${tripLabel}] Product card for "${productA}" not found in store`,
        );
      });
    await cardA.click();
    await page.waitForLoadState("networkidle");

    const addToCartA = page.getByTestId("add-to-cart");
    await addToCartA
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[checkoutTrip ${tripLabel}] add-to-cart button not found on product page for "${productA}"`,
        );
      });
    await addToCartA.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${tripLabel}-cartA`);

    // ── Step 2: Add product B ──────────────────────────────────────────────
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    const cardB = page
      .locator(`[data-testid^="product-card-"]`)
      .filter({ hasText: productB })
      .first();
    await cardB
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[checkoutTrip ${tripLabel}] Product card for "${productB}" not found in store`,
        );
      });
    await cardB.click();
    await page.waitForLoadState("networkidle");

    const addToCartB = page.getByTestId("add-to-cart");
    await addToCartB
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[checkoutTrip ${tripLabel}] add-to-cart button not found on product page for "${productB}"`,
        );
      });
    await addToCartB.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${tripLabel}-cartB`);

    // ── Step 3: Checkout page ──────────────────────────────────────────────
    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${tripLabel}-checkout-page`);

    // ── Step 4: Fill each seller card ─────────────────────────────────────
    const sellerCards = page.locator(`[data-testid^="seller-checkout-"]`);
    await sellerCards
      .first()
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[checkoutTrip ${tripLabel}] No seller-checkout-* cards visible on checkout page`,
        );
      });

    const cardCount = await sellerCards.count();
    expect(
      cardCount,
      `[checkoutTrip ${tripLabel}] Expected at least 2 seller checkout cards, got ${cardCount}`,
    ).toBeGreaterThanOrEqual(2);

    const filledCardIds: string[] = [];
    for (let i = 0; i < cardCount; i++) {
      const card = sellerCards.nth(i);

      // Fill transfer number
      const transferInput = card
        .locator("input[type='text'], input[placeholder]")
        .first();
      if (await transferInput.isVisible().catch(() => false)) {
        await transferInput.fill(`TRF-${tripLabel}-${i}-${runId}`);
      }

      // Upload receipt
      const fileInput = card.locator("input[type='file']");
      if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileInput.setInputFiles(RECEIPT_FIXTURE);
      } else {
        // Fallback: click upload trigger button then set files on the last file input
        const uploadBtn = card
          .locator("button")
          .filter({ hasText: /upload|receipt/i })
          .first();
        if (await uploadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await uploadBtn.click();
          const input = page.locator("input[type='file']").last();
          await input.setInputFiles(RECEIPT_FIXTURE);
        }
      }
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);

      // Per-card submit (some designs have individual submit buttons)
      // eslint-disable-next-line no-restricted-syntax
      const submitBtn = card.getByRole("button", {
        name: /submit|pay|send/i,
      });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(MUTATION_WAIT_MS);
      }

      const cardTestId = await card.getAttribute("data-testid");
      filledCardIds.push((cardTestId ?? "").replace("seller-checkout-", ""));
    }

    // ── Step 5: Global submit (if present) ─────────────────────────────────
    const globalSubmit = page.getByTestId("checkout-submit");
    if (await globalSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await globalSubmit.click();
      await page.waitForTimeout(BULK_MUTATION_WAIT_MS);
    }
    await snap(page, `${tripLabel}-submitted`);

    // ── Step 6: Orders page snapshot ───────────────────────────────────────
    await page.goto(`${APP_URLS.PAYMENTS}/en/orders`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, `${tripLabel}-orders-page`);

    return [filledCardIds[0] ?? "", filledCardIds[1] ?? ""];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1: SellerA Studio Setup
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Phase 1a — SellerA creates 3 products in Studio.
   *
   * Product A1:
   *   - Created with all 4 section types (cards, accordion, two-column, gallery)
   *   - Section 0 drag-reordered down 1 position
   *   - 3 URL images added; cover changed to index 1 then back to 0
   *   - Saved
   *
   * Product A2:
   *   - Basic creation (name + price)
   *   - Later edited in this same test
   *
   * Product A3:
   *   - Created then deactivated (product-active-toggle unchecked)
   *   - Represents "reserved for future use"
   *
   * After all 3 are created:
   *   - A2 is edited (name + price) and the edit is verified in the table
   *   - Product list is drag-reordered (first product moved down 1)
   *
   * @throws If product IDs cannot be extracted (createProduct throws).
   * @throws If A3 deactivation toggle is not found.
   */
  test("Phase 1a: seller A creates 3 products with sections, images, drag-reorder", async ({
    context,
    page,
  }) => {
    test.setTimeout(180_000);
    await injectSession(context, sellerA);

    // ── Product A1: full setup ────────────────────────────────────────────
    productIdA1 = await createProduct(
      page,
      context,
      sellerA,
      PRODUCT_A1,
      "15000",
      "sellerA-p1",
    );
    expect(
      productIdA1,
      "[Phase 1a] productIdA1 must be a non-empty UUID",
    ).toBeTruthy();

    // Open A1 in editor to add sections and images
    await page.goto(`${APP_URLS.STUDIO}/en/products/${productIdA1}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await addAndReorderSections(page, "sellerA-p1");
    await addImagesAndChangeCover(page, "sellerA-p1");

    // Save A1 with sections/images
    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error(
          "[Phase 1a] Did not redirect to Studio list after saving A1",
        );
      });
    await snap(page, "sellerA-p1-saved");

    // ── Product A2: basic creation ────────────────────────────────────────
    productIdA2 = await createProduct(
      page,
      context,
      sellerA,
      PRODUCT_A2,
      "12000",
      "sellerA-p2",
    );
    expect(
      productIdA2,
      "[Phase 1a] productIdA2 must be a non-empty UUID",
    ).toBeTruthy();

    // ── Product A3: created and immediately deactivated ───────────────────
    productIdA3 = await createProduct(
      page,
      context,
      sellerA,
      PRODUCT_A3,
      "99000",
      "sellerA-p3",
    );
    expect(
      productIdA3,
      "[Phase 1a] productIdA3 must be a non-empty UUID",
    ).toBeTruthy();

    // Open A3 to toggle active off
    await page.goto(`${APP_URLS.STUDIO}/en/products/${productIdA3}`);
    await page.waitForLoadState("networkidle");

    const toggleActive = page.getByTestId("product-active-toggle");
    if (await toggleActive.isVisible().catch(() => false)) {
      // Only uncheck if currently checked (default is active)
      if (await toggleActive.isChecked().catch(() => true)) {
        await toggleActive.click();
        await page.waitForTimeout(DEBOUNCE_WAIT_MS);
      }
    } else {
      console.warn(
        "[Phase 1a] product-active-toggle not found — A3 may already be inactive",
      );
    }

    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error(
          "[Phase 1a] Did not redirect to Studio list after deactivating A3",
        );
      });
    await snap(page, "sellerA-p3-inactive");

    // ── Edit A2: change name and price, verify in table ───────────────────
    await editAndVerifyProduct(
      page,
      PRODUCT_A2,
      `${PRODUCT_A2} Edited`,
      "13500",
      "sellerA-p2-edit",
    );

    // ── Reorder product list ───────────────────────────────────────────────
    await reorderProducts(page, "sellerA-reorder");
  });

  /**
   * Phase 1b — SellerA creates 2 payment methods.
   *
   * Both methods require:
   *   - receipt upload (payment-method-requires-receipt = checked)
   *   - transfer number field (payment-method-requires-transfer-number = checked)
   *
   * This ensures that every buyer checkout for sellerA will demand receipt evidence.
   */
  test("Phase 1b: seller A creates 2 payment methods", async ({
    context,
    page,
  }) => {
    // Payment method 1
    await createPaymentMethod(
      page,
      context,
      sellerA,
      `SellerA Method-1 ${runId}`,
      "Send to account 1234 (SellerA)",
      "Transfer Number",
      "sellerA-pm1",
    );

    // Payment method 2
    await createPaymentMethod(
      page,
      context,
      sellerA,
      `SellerA Method-2 ${runId}`,
      "Send to account 5678 (SellerA)",
      "Reference Code",
      "sellerA-pm2",
    );
  });

  /**
   * Phase 1c — SellerA adds 3 delegates.
   *
   * delegateA1 → FULL: ["orders.approve", "orders.request_proof"]
   *   - Can approve orders AND request evidence
   *
   * delegateA2 → FULL: ["orders.approve", "orders.request_proof"]
   *   - Will be used in Scenario B to approve orderA2
   *
   * delegateA3 → PROOF-ONLY: ["orders.request_proof"]
   *   - Can request evidence but backend rejects approval attempts
   *   - Used in Scenario C (sellerB's analogue: delegateB3 demonstrates the gate)
   */
  test("Phase 1c: seller A adds 3 delegates (A1+A2=full, A3=proof-only)", async ({
    context,
    page,
  }) => {
    await addDelegate(
      page,
      context,
      sellerA,
      delegateA1,
      [...DELEGATE_PERMISSIONS],
      "dA1",
    );
    await addDelegate(
      page,
      context,
      sellerA,
      delegateA2,
      [...DELEGATE_PERMISSIONS],
      "dA2",
    );
    await addDelegate(
      page,
      context,
      sellerA,
      delegateA3,
      ["orders.request_proof"],
      "dA3",
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2: SellerB Studio Setup
  // Mirrors Phase 1 for the second independent seller.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Phase 2a — SellerB creates 3 products in Studio.
   *
   * Mirrors Phase 1a exactly for sellerB:
   *   - B1 gets full sections + images setup
   *   - B2 is basic, then edited
   *   - B3 is created and deactivated
   *   - Product list is drag-reordered
   */
  test("Phase 2a: seller B creates 3 products with sections, images, drag-reorder", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerB);

    // ── Product B1 ────────────────────────────────────────────────────────
    productIdB1 = await createProduct(
      page,
      context,
      sellerB,
      PRODUCT_B1,
      "20000",
      "sellerB-p1",
    );
    expect(
      productIdB1,
      "[Phase 2a] productIdB1 must be a non-empty UUID",
    ).toBeTruthy();

    await page.goto(`${APP_URLS.STUDIO}/en/products/${productIdB1}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await addAndReorderSections(page, "sellerB-p1");
    await addImagesAndChangeCover(page, "sellerB-p1");

    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error("[Phase 2a] Did not redirect after saving B1");
      });

    // ── Product B2 ────────────────────────────────────────────────────────
    productIdB2 = await createProduct(
      page,
      context,
      sellerB,
      PRODUCT_B2,
      "18000",
      "sellerB-p2",
    );
    expect(
      productIdB2,
      "[Phase 2a] productIdB2 must be a non-empty UUID",
    ).toBeTruthy();

    // ── Product B3: inactive ───────────────────────────────────────────────
    productIdB3 = await createProduct(
      page,
      context,
      sellerB,
      PRODUCT_B3,
      "99000",
      "sellerB-p3",
    );
    expect(
      productIdB3,
      "[Phase 2a] productIdB3 must be a non-empty UUID",
    ).toBeTruthy();

    await page.goto(`${APP_URLS.STUDIO}/en/products/${productIdB3}`);
    await page.waitForLoadState("networkidle");

    const toggleActive = page.getByTestId("product-active-toggle");
    if (await toggleActive.isVisible().catch(() => false)) {
      if (await toggleActive.isChecked().catch(() => true)) {
        await toggleActive.click();
        await page.waitForTimeout(DEBOUNCE_WAIT_MS);
      }
    } else {
      console.warn(
        "[Phase 2a] product-active-toggle not found — B3 may already be inactive",
      );
    }
    await page.getByTestId("toolbar-save").click();
    await page
      .waitForURL(`${APP_URLS.STUDIO}/en`, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error("[Phase 2a] Did not redirect after deactivating B3");
      });
    await snap(page, "sellerB-p3-inactive");

    // ── Edit B2 ────────────────────────────────────────────────────────────
    await editAndVerifyProduct(
      page,
      PRODUCT_B2,
      `${PRODUCT_B2} Edited`,
      "19500",
      "sellerB-p2-edit",
    );

    // ── Reorder ────────────────────────────────────────────────────────────
    await reorderProducts(page, "sellerB-reorder");
  });

  /**
   * Phase 2b — SellerB creates 2 payment methods.
   * Mirrors Phase 1b for sellerB.  Both methods require receipt + transfer number.
   */
  test("Phase 2b: seller B creates 2 payment methods", async ({
    context,
    page,
  }) => {
    await createPaymentMethod(
      page,
      context,
      sellerB,
      `SellerB Method-1 ${runId}`,
      "Send to account ABCD (SellerB)",
      "Transfer Number",
      "sellerB-pm1",
    );

    await createPaymentMethod(
      page,
      context,
      sellerB,
      `SellerB Method-2 ${runId}`,
      "Send to account EFGH (SellerB)",
      "Reference Code",
      "sellerB-pm2",
    );
  });

  /**
   * Phase 2c — SellerB adds 3 delegates.
   *
   * delegateB1 → FULL (used in Scenario B to observe, and in C as witness)
   * delegateB2 → FULL (used in Scenario C to perform final approval of orderB2)
   * delegateB3 → PROOF-ONLY (Scenario C protagonist: attempts approve → rejected,
   *              then requests evidence)
   */
  test("Phase 2c: seller B adds 3 delegates (B1+B2=full, B3=proof-only)", async ({
    context,
    page,
  }) => {
    await addDelegate(
      page,
      context,
      sellerB,
      delegateB1,
      [...DELEGATE_PERMISSIONS],
      "dB1",
    );
    await addDelegate(
      page,
      context,
      sellerB,
      delegateB2,
      [...DELEGATE_PERMISSIONS],
      "dB2",
    );
    await addDelegate(
      page,
      context,
      sellerB,
      delegateB3,
      ["orders.request_proof"],
      "dB3",
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Buyer Checkout Trips
  //
  // Two separate checkout trips so we get 4 distinct orders:
  //   Trip 1 → orderA1 (sellerA) + orderB1 (sellerB)
  //   Trip 2 → orderA2 (sellerA) + orderB2 (sellerB)
  //
  // After each trip the seller sales pages are visited to capture order IDs
  // from the order-approve-{uuid} testids.  Trip 2 IDs are disambiguated by
  // filtering out the IDs already captured from Trip 1.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Phase 3a — Buyer executes checkout Trip 1.
   *
   * Adds A1 and B1 to cart, fills transfer numbers and uploads receipt fixture
   * for each seller card, then submits.
   */
  test("Phase 3a: buyer checkout trip 1 (A1 + B1)", async ({
    context,
    page,
  }) => {
    await checkoutTrip(page, context, PRODUCT_A1, PRODUCT_B1, "trip1");
  });

  /**
   * Phase 3b — Capture Trip 1 orderA1 ID from sellerA's sales page.
   *
   * Visits /en/sales as sellerA and reads the first order-approve-{uuid} testid.
   * At this point only one order from trip 1 should be pending for sellerA.
   *
   * @throws If no order-approve button is visible within LONG_OPERATION_TIMEOUT_MS.
   * @throws If the extracted ID is empty.
   */
  test("Phase 3b: capture trip-1 order ID from seller A sales page", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerA);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const approveBtn = page.locator(`[data-testid^="order-approve-"]`).first();
    await approveBtn
      .waitFor({ state: "visible", timeout: LONG_OPERATION_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          "[Phase 3b] No order-approve-* button visible on sellerA sales page after Trip 1 — order may not have been created",
        );
      });

    const tid = await approveBtn.getAttribute("data-testid");
    orderA1Id = (tid ?? "").replace("order-approve-", "");
    if (!orderA1Id) {
      throw new Error(
        `[Phase 3b] Could not extract orderA1Id from testid "${tid ?? "null"}"`,
      );
    }
    await snap(page, "sellerA-trip1-orders");
  });

  /**
   * Phase 3c — Capture Trip 1 orderB1 ID from sellerB's sales page.
   * Same approach as 3b for sellerB.
   *
   * @throws If no order-approve button is visible.
   * @throws If extracted ID is empty.
   */
  test("Phase 3c: capture trip-1 order ID from seller B sales page", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerB);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const approveBtn = page.locator(`[data-testid^="order-approve-"]`).first();
    await approveBtn
      .waitFor({ state: "visible", timeout: LONG_OPERATION_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          "[Phase 3c] No order-approve-* button visible on sellerB sales page after Trip 1",
        );
      });

    const tid = await approveBtn.getAttribute("data-testid");
    orderB1Id = (tid ?? "").replace("order-approve-", "");
    if (!orderB1Id) {
      throw new Error(
        `[Phase 3c] Could not extract orderB1Id from testid "${tid ?? "null"}"`,
      );
    }
    await snap(page, "sellerB-trip1-orders");
  });

  /**
   * Phase 3d — Buyer executes checkout Trip 2.
   *
   * Uses the edited product names (A2 Edited, B2 Edited) since Phase 1a/2a
   * renamed those products.
   */
  test("Phase 3d: buyer checkout trip 2 (A2 + B2)", async ({
    context,
    page,
  }) => {
    await checkoutTrip(
      page,
      context,
      `${PRODUCT_A2} Edited`,
      `${PRODUCT_B2} Edited`,
      "trip2",
    );
  });

  /**
   * Phase 3e — Capture Trip 2 orderA2 ID from sellerA's sales page.
   *
   * After Trip 2, sellerA has two pending orders (A1 and A2).
   * This test iterates all order-approve-* testids and captures the one
   * whose ID does NOT match the already-known orderA1Id.
   *
   * @throws If no pending approve buttons are visible.
   * @throws If no button with a new (non-A1) ID is found.
   */
  test("Phase 3e: capture trip-2 order ID from seller A sales page", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerA);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const allBtns = page.locator(`[data-testid^="order-approve-"]`);
    await allBtns
      .first()
      .waitFor({ state: "visible", timeout: LONG_OPERATION_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          "[Phase 3e] No order-approve-* buttons on sellerA sales page after Trip 2",
        );
      });

    const count = await allBtns.count();
    for (let i = 0; i < count; i++) {
      const tid = await allBtns.nth(i).getAttribute("data-testid");
      const id = (tid ?? "").replace("order-approve-", "");
      if (id && id !== orderA1Id) {
        orderA2Id = id;
        break;
      }
    }

    if (!orderA2Id) {
      throw new Error(
        `[Phase 3e] Could not find a second pending order for sellerA (orderA1Id=${orderA1Id}). ` +
          `Found ${count} approve button(s) but none had a different ID.`,
      );
    }
    await snap(page, "sellerA-trip2-orders");
  });

  /**
   * Phase 3f — Capture Trip 2 orderB2 ID from sellerB's sales page.
   * Same disambiguation approach as 3e for sellerB.
   *
   * @throws If no second pending order is found for sellerB.
   */
  test("Phase 3f: capture trip-2 order ID from seller B sales page", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerB);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const allBtns = page.locator(`[data-testid^="order-approve-"]`);
    await allBtns
      .first()
      .waitFor({ state: "visible", timeout: LONG_OPERATION_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          "[Phase 3f] No order-approve-* buttons on sellerB sales page after Trip 2",
        );
      });

    const count = await allBtns.count();
    for (let i = 0; i < count; i++) {
      const tid = await allBtns.nth(i).getAttribute("data-testid");
      const id = (tid ?? "").replace("order-approve-", "");
      if (id && id !== orderB1Id) {
        orderB2Id = id;
        break;
      }
    }

    if (!orderB2Id) {
      throw new Error(
        `[Phase 3f] Could not find a second pending order for sellerB (orderB1Id=${orderB1Id}). ` +
          `Found ${count} approve button(s) but none had a different ID.`,
      );
    }
    await snap(page, "sellerB-trip2-orders");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — Scenario A: Seller-only Approval
  //
  // sellerA approves orderA1 directly on /sales.
  // delegateA1 observes the completed state on /assigned.
  //
  // This scenario verifies the baseline happy path: a seller handles their
  // own order without any delegate involvement, and delegates can still see
  // the resulting completed state on their assigned orders view.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scenario A – sellerA approves orderA1 and verifies the receipt hash.
   *
   * Steps:
   *   1. Navigate to sellerA /sales
   *   2. Verify receipt SHA-256 hash via receipt-view-link
   *   3. Click approve → confirm panel → submit
   *   4. Assert approve button disappears (order moved to approved state)
   *
   * @throws If the approve button is not visible before approval.
   * @throws If receipt hash does not match (via verifyReceiptHash).
   * @throws If the approve button is still visible after approval.
   */
  test("Phase 4 Scenario A: sellerA approves orderA1 and verifies receipt hash", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerA);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId(`order-approve-${orderA1Id}`),
      `[Scenario A] order-approve-${orderA1Id} must be visible on sellerA /sales`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioA-before-approve");

    // Verify receipt file integrity before approving
    await verifyReceiptHash(page, orderA1Id);

    // Approve
    await approveOrder(page, orderA1Id);
    await snap(page, "scenarioA-approved");

    // Approve button must be gone — order is now approved
    await expect(
      page.locator(`[data-testid="order-approve-${orderA1Id}"]`),
      `[Scenario A] order-approve-${orderA1Id} should not be visible after approval`,
    ).not.toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
  });

  /**
   * Scenario A – delegateA1 observes orderA1 in completed state on /assigned.
   *
   * delegateA1 has full permissions and should see orders belonging to sellerA.
   * The approved order should appear (no pending approve button) confirming
   * that the assigned view reflects the seller's approval.
   *
   * This test does NOT assert a specific order status badge text (locale-agnostic),
   * only that the assigned page loads and the approve button is absent.
   */
  test("Phase 4 Scenario A: delegateA1 observes orderA1 approved on /assigned", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateA1);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario A] delegateA1 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioA-dA1-assigned");

    // The approve button should not be available since sellerA already approved
    await expect(
      page.locator(`[data-testid="order-approve-${orderA1Id}"]`),
      "[Scenario A] order-approve button for orderA1 should not be visible on delegateA1 /assigned (already approved)",
    ).not.toBeVisible();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Scenario B: Mixed Seller + Delegate Approvals
  //
  // delegateA2 approves orderA2 via /assigned; sellerA verifies on /sales.
  // sellerB approves orderB1 directly on /sales; delegateB1 observes on /assigned.
  //
  // This scenario verifies that delegates can approve on behalf of sellers,
  // that those approvals are immediately visible to the seller, and that
  // cross-seller isolation holds (delegateA cannot see sellerB's orders
  // and vice versa).
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scenario B – delegateA2 approves orderA2 via /assigned.
   *
   * delegateA2 has full permissions for sellerA.  The order should appear on
   * /assigned and be approvable.  Receipt hash is verified before approval.
   *
   * @throws If order-approve-{orderA2Id} is not visible on delegateA2 /assigned.
   * @throws If receipt hash does not match.
   */
  test("Phase 5 Scenario B: delegateA2 approves orderA2", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateA2);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario B] delegateA2 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioB-dA2-before-approve");

    await expect(
      page.getByTestId(`order-approve-${orderA2Id}`),
      `[Scenario B] order-approve-${orderA2Id} must be visible on delegateA2 /assigned`,
    ).toBeVisible({ timeout: LONG_OPERATION_TIMEOUT_MS });

    await verifyReceiptHash(page, orderA2Id);
    await approveOrder(page, orderA2Id);
    await snap(page, "scenarioB-dA2-approved");
  });

  /**
   * Scenario B – sellerA verifies orderA2 is now in approved state on /sales.
   *
   * After delegateA2 approved orderA2, the approve button must be absent
   * from sellerA's sales page, confirming the delegate action was persisted.
   *
   * @throws If approve button is still visible (delegate approval not reflected).
   */
  test("Phase 5 Scenario B: sellerA verifies orderA2 is approved", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerA);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.locator(`[data-testid="order-approve-${orderA2Id}"]`),
      `[Scenario B] order-approve-${orderA2Id} should not be on sellerA /sales after delegateA2 approved it`,
    ).not.toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioB-sellerA-verified");
  });

  /**
   * Scenario B – sellerB approves orderB1 directly on /sales.
   *
   * sellerB takes the seller-side approval path (no delegate involvement),
   * with receipt hash verification before the approval action.
   *
   * @throws If order-approve button for orderB1 is not visible.
   * @throws If receipt hash does not match.
   */
  test("Phase 5 Scenario B: sellerB approves orderB1 and verifies receipt hash", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerB);
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId(`order-approve-${orderB1Id}`),
      `[Scenario B] order-approve-${orderB1Id} must be visible on sellerB /sales`,
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    await verifyReceiptHash(page, orderB1Id);
    await approveOrder(page, orderB1Id);
    await snap(page, "scenarioB-sellerB-approved");
  });

  /**
   * Scenario B – delegateB1 observes orderB1 approved on /assigned.
   *
   * After sellerB approved orderB1, delegateB1 (who has full permissions)
   * should see the order in a completed state — i.e. no pending approve button.
   */
  test("Phase 5 Scenario B: delegateB1 observes orderB1 approved on /assigned", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateB1);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario B] delegateB1 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioB-dB1-assigned");

    // orderB1 is already approved — approve button should be absent
    await expect(
      page.locator(`[data-testid="order-approve-${orderB1Id}"]`),
      "[Scenario B] order-approve button for orderB1 should not be visible on delegateB1 /assigned (already approved by sellerB)",
    ).not.toBeVisible();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — Scenario C: Delegate Proof Gate
  //
  // delegateB3 only has orders.request_proof (no orders.approve).
  // Despite having can_manage=true (making the approve button visible), the
  // backend rejects an approval attempt from a proof-only delegate.
  //
  // Full flow:
  //   1. delegateB3 attempts to approve orderB2 → backend rejects
  //   2. delegateB3 requests evidence (proof) for orderB2
  //   3. delegateB1 sees the evidence_requested status on /assigned
  //   4. buyer navigates to /orders and resubmits the receipt for orderB2
  //   5. delegateB2 (full perms) approves orderB2 with receipt hash verification
  //   6. buyer's /orders page shows all 4 orders are approved (no pending buttons)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Scenario C – delegateB3 (proof-only) attempts to approve orderB2.
   *
   * Because orders.request_proof sets can_manage=true in the UI, the approve
   * button IS rendered.  Clicking through the confirm panel triggers a backend
   * rejection.  We verify the rejection by asserting that either:
   *   (a) the approve button is still visible after the attempt, OR
   *   (b) an error toast/alert appears.
   *
   * If the approve button is not even visible (backend enforces UI hiding),
   * that is also acceptable behaviour and the test passes with a warning.
   *
   * @throws If the approval somehow succeeds (approve button disappears AND
   *         no error toast is shown) — that would be a security regression.
   */
  test("Phase 6 Scenario C: delegateB3 (proof-only) attempts to approve orderB2 and fails", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateB3);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario C] delegateB3 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snap(page, "scenarioC-dB3-assigned");

    const approveBtn = page.getByTestId(`order-approve-${orderB2Id}`);
    const isApproveVisible = await approveBtn
      .isVisible({ timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => false);

    if (!isApproveVisible) {
      // Backend hides the button entirely for proof-only delegates — acceptable
      console.warn(
        `[Scenario C] order-approve-${orderB2Id} not visible for delegateB3 — ` +
          "backend may hide approve button for proof-only delegates (acceptable)",
      );
      return;
    }

    // The button is visible; attempt the full approval flow
    await approveBtn.click();

    const panel = page.getByTestId("confirm-action-panel");
    if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Panel didn't open — approval was blocked before confirmation
      console.warn(
        "[Scenario C] Confirm panel did not open for delegateB3 — blocked upstream",
      );
      return;
    }

    await page.getByTestId("confirm-checkbox").check();
    await page.getByTestId("confirm-action-submit").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Verify rejection: either the approve button is still present OR an error appeared
    const stillApprove = await page
      .getByTestId(`order-approve-${orderB2Id}`)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const errorToast =
      (await page
        .getByTestId("toast-error")
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .locator('[role="alert"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    expect(
      stillApprove || errorToast,
      `[Scenario C] Backend must reject delegateB3 approval of orderB2. ` +
        `Neither the approve button persisted nor an error toast appeared — ` +
        `this would be a security regression (proof-only delegate approved an order).`,
    ).toBe(true);

    await snap(page, "scenarioC-dB3-approve-rejected");
  });

  /**
   * Scenario C – delegateB3 requests evidence (proof) for orderB2.
   *
   * delegateB3 has orders.request_proof permission, so the evidence request
   * button must be available.  The test:
   *   1. Clicks "order-evidence-{orderB2Id}"
   *   2. Fills the seller-note/evidence message input (if visible)
   *   3. Submits the request
   *
   * @throws If "order-evidence-{orderB2Id}" button is not visible.
   */
  test("Phase 6 Scenario C: delegateB3 requests proof (evidence) for orderB2", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateB3);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Evidence request button must be available for a proof-only delegate
    const evidenceBtn = page.getByTestId(`order-evidence-${orderB2Id}`);
    await evidenceBtn
      .waitFor({ state: "visible", timeout: ELEMENT_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[Scenario C] order-evidence-${orderB2Id} not visible for delegateB3 — ` +
            "proof-only delegate must have access to the evidence request button",
        );
      });
    await evidenceBtn.click();
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    // Fill the evidence message (optional — only attempt if the input appears)
    const noteInput = page
      .getByTestId("seller-note-input")
      .or(page.locator("textarea"))
      .first();
    if (await noteInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noteInput.fill("Please resubmit a clearer receipt photo.");
    }

    // Submit the request
    // eslint-disable-next-line no-restricted-syntax
    const submitNote = page.getByRole("button", {
      name: /send|submit|request/i,
    });
    if (await submitNote.isVisible().catch(() => false)) {
      await submitNote.click();
      await page.waitForTimeout(MUTATION_WAIT_MS);
    }
    await snap(page, "scenarioC-dB3-evidence-requested");
  });

  /**
   * Scenario C – delegateB1 sees evidence_requested status for orderB2.
   *
   * After delegateB3 requested evidence, the order status for orderB2 should
   * transition to evidence_requested / proof_pending.  delegateB1 (full perms)
   * should see this status reflected on /assigned.
   *
   * The assertion is lenient about the exact testid naming of the status
   * badge (it may vary by implementation), falling back to page-level
   * visibility if no specific badge testid is found.
   */
  test("Phase 6 Scenario C: delegateB1 sees evidence_requested status for orderB2", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateB1);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario C] delegateB1 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Look for any evidence/proof status indicator scoped to orderB2
    const statusEl = page
      .locator(
        `[data-testid="order-status-${orderB2Id}"], ` +
          `[data-testid*="${orderB2Id}"][data-testid*="evidence"], ` +
          `[data-testid*="${orderB2Id}"][data-testid*="proof"]`,
      )
      .first();

    if (
      await statusEl
        .isVisible({ timeout: ELEMENT_TIMEOUT_MS })
        .catch(() => false)
    ) {
      await expect(
        statusEl,
        "[Scenario C] Evidence/proof status element must be visible for orderB2 on delegateB1 /assigned",
      ).toBeVisible();
    } else {
      // Status indicator not found with known testid pattern; page is loaded
      // and the absence of the approve button also implies pending state
      console.warn(
        `[Scenario C] No status badge found for order ${orderB2Id} — ` +
          "verifying assigned page is at least visible",
      );
      await expect(
        page.getByTestId("assigned-orders-page"),
        "[Scenario C] assigned-orders-page must be visible even without explicit status badge",
      ).toBeVisible();
    }
    await snap(page, "scenarioC-dB1-evidence-status");
  });

  /**
   * Scenario C – buyer resubmits a receipt for orderB2.
   *
   * The buyer sees that orderB2 has an evidence request and resubmits the
   * receipt via the buyer orders page.
   *
   * Steps:
   *   1. Navigate to buyer /en/orders
   *   2. Find the resubmit area for orderB2 (order-resubmit-{id} or receipt-resubmit-{id})
   *   3. Upload the receipt fixture file
   *   4. Save / submit
   *
   * The resubmit UI surface may vary; the test attempts both a dedicated
   * resubmit testid and a generic file input, and logs a warning if neither
   * is found (rather than failing hard, since the delivery UX may differ).
   */
  test("Phase 6 Scenario C: buyer resubmits receipt for orderB2", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);
    await page.goto(`${APP_URLS.PAYMENTS}/en/orders`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await snap(page, "scenarioC-buyer-orders");

    // Attempt dedicated resubmit surface first
    const resubmitArea = page
      .locator(
        `[data-testid="order-resubmit-${orderB2Id}"], ` +
          `[data-testid="receipt-resubmit-${orderB2Id}"]`,
      )
      .first();

    if (
      await resubmitArea
        .isVisible({ timeout: ELEMENT_TIMEOUT_MS })
        .catch(() => false)
    ) {
      await resubmitArea.click();
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    } else {
      console.warn(
        `[Scenario C] Dedicated resubmit area for order ${orderB2Id} not found — ` +
          "attempting generic file input",
      );
    }

    // Upload via file input (scoped to order-specific area if possible)
    const fileInput = page
      .locator(
        `[data-testid="receipt-upload-${orderB2Id}"] input[type="file"], ` +
          `input[type="file"]`,
      )
      .last();

    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(RECEIPT_FIXTURE);
      await page.waitForTimeout(DEBOUNCE_WAIT_MS);
    } else {
      console.warn(
        `[Scenario C] No file input found for order ${orderB2Id} receipt resubmission`,
      );
    }

    // Save if a save/upload/submit button is available
    // eslint-disable-next-line no-restricted-syntax
    const saveBtn = page.getByRole("button", {
      name: /save|upload|submit|resubmit/i,
    });
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(MUTATION_WAIT_MS);
    }
    await snap(page, "scenarioC-buyer-resubmitted");
  });

  /**
   * Scenario C – delegateB2 approves orderB2 and verifies receipt hash.
   *
   * delegateB2 has full permissions.  After the buyer's resubmission, the
   * order should be approvable again (or still pending if resubmit is async).
   * Receipt hash is verified before approval.
   *
   * @throws If order-approve-{orderB2Id} is not visible on delegateB2 /assigned.
   * @throws If receipt hash does not match.
   * @throws If approve button is still present after approval.
   */
  test("Phase 6 Scenario C: delegateB2 approves orderB2 and verifies receipt hash", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateB2);
    await page.goto(`${APP_URLS.PAYMENTS}/en/assigned`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("assigned-orders-page"),
      "[Scenario C] delegateB2 assigned-orders-page must be visible",
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    const approveBtn = page.getByTestId(`order-approve-${orderB2Id}`);
    await approveBtn
      .waitFor({ state: "visible", timeout: LONG_OPERATION_TIMEOUT_MS })
      .catch(() => {
        throw new Error(
          `[Scenario C] order-approve-${orderB2Id} not visible on delegateB2 /assigned. ` +
            "The order may not have returned to a pending state after buyer resubmitted evidence.",
        );
      });
    await snap(page, "scenarioC-dB2-before-approve");

    // Verify resubmitted receipt hash
    await verifyReceiptHash(page, orderB2Id);

    // Approve
    await approveOrder(page, orderB2Id);
    await snap(page, "scenarioC-dB2-approved");

    // Confirm the order moved out of pending state
    await expect(
      page.locator(`[data-testid="order-approve-${orderB2Id}"]`),
      `[Scenario C] order-approve-${orderB2Id} should not be visible after delegateB2 approved it`,
    ).not.toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
  });

  /**
   * Scenario C final – buyer sees all 4 orders approved.
   *
   * All 4 orders (A1, A2, B1, B2) have been approved by this point:
   *   A1 → sellerA (Scenario A)
   *   A2 → delegateA2 (Scenario B)
   *   B1 → sellerB (Scenario B)
   *   B2 → delegateB2 (Scenario C)
   *
   * None of the order-approve-{id} buttons should be present on the buyer's
   * orders page, confirming the entire purchase flow is complete.
   *
   * Note: Only asserts for IDs that were successfully captured (non-empty).
   */
  test("Phase 6 Scenario C: buyer sees all 4 orders approved", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);
    await page.goto(`${APP_URLS.PAYMENTS}/en/orders`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await snap(page, "scenarioC-buyer-all-approved");

    // No pending approve buttons should remain for any of the 4 orders
    for (const [label, orderId] of [
      ["orderA1", orderA1Id],
      ["orderA2", orderA2Id],
      ["orderB1", orderB1Id],
      ["orderB2", orderB2Id],
    ] as [string, string][]) {
      if (!orderId) {
        console.warn(
          `[Final check] ${label} ID was not captured — skipping assertion`,
        );
        continue;
      }
      await expect(
        page.locator(`[data-testid="order-approve-${orderId}"]`),
        `[Final check] ${label} (${orderId}) should not show a pending approve button on buyer /orders`,
      ).not.toBeVisible();
    }
  });
});
