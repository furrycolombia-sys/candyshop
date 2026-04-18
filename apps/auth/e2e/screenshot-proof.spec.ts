import path from "node:path";

import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  APP_URLS,
  DEBOUNCE_WAIT_MS,
  ELEMENT_TIMEOUT_MS,
  LONG_OPERATION_TIMEOUT_MS,
  MUTATION_WAIT_MS,
  NAVIGATION_TIMEOUT_MS,
} from "./helpers/constants";
import {
  adminDelete,
  createTestUser,
  injectSession,
  SELLER_PERMISSIONS,
  type TestUser,
} from "./helpers/session";

const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots-proof");

/** Focused element screenshot helper — saves to screenshots-proof/ */
let stepCounter = 0;
async function snapElement(
  element: import("@playwright/test").Locator,
  label: string,
): Promise<void> {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, "0")}-${label}.png`;
  await element.screenshot({ path: path.join(SCREENSHOTS_DIR, filename) });
}

/** Full page screenshot helper */
async function snapPage(
  page: import("@playwright/test").Page,
  label: string,
): Promise<void> {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, "0")}-${label}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage: false,
  });
}

/**
 * Screenshot Proof — Studio UX Improvements
 *
 * Captures focused screenshots proving the 3 studio-ux-improvements features:
 * 1. Cover Image Selection (Star icons, filled yellow star, cover in table)
 * 2. Per-Product Delegate Management (Manage Delegates button, badge, delegates page)
 * 3. GripVertical Drag Handles (visible on desktop thumbnails)
 */
test.describe.serial("Screenshot Proof — Studio UX Improvements", () => {
  let seller: TestUser;
  let delegate: TestUser;
  let productId: string;

  test.beforeAll(async () => {
    stepCounter = 0;
    // Ensure screenshots directory exists
    const fs = await import("node:fs");
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    seller = await createTestUser("proofSeller", SELLER_PERMISSIONS);
    delegate = await createTestUser("proofDelegate", ["orders.read"]);
  });

  test.afterAll(async () => {
    try {
      if (seller) {
        await adminDelete(
          "seller_admins",
          `seller_id=eq.${seller.userId}`,
        ).catch(() => {});
      }
      if (delegate) {
        await adminDelete(
          "user_permissions",
          `user_id=eq.${delegate.userId}`,
        ).catch(() => {});
      }
    } catch {
      // best-effort
    }
    if (seller) {
      await cleanupTestData(seller.userId, "").catch(() => {});
    }
    if (delegate) {
      const { supabaseAdmin } = await import("./helpers/session");
      await supabaseAdmin.auth.admin
        .deleteUser(delegate.userId)
        .catch(() => {});
    }
  });

  // ─── Setup: Create product with 2 images ──────────────────────

  test("Setup: create product with 2 images", async ({ context, page }) => {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    // Create a new product
    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");

    // Fill product name
    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField.click();
    await nameField.fill("Screenshot Proof Product");

    // Fill price
    const priceField = page.getByTestId("inline-price-cop");
    await priceField.click();
    await priceField.fill("25000");

    // Add first image
    const desktopThumbs = page.getByTestId("image-gallery-thumbs");
    const addImageBtn = desktopThumbs.getByTestId("image-thumb-add");
    await addImageBtn.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const urlInput = page.getByTestId("image-edit-url");
    await expect(urlInput).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await urlInput.fill(
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400",
    );
    const altInput = page.getByTestId("image-edit-alt");
    await altInput.fill("Candy image 1");
    await page.getByTestId("image-edit-done").click();

    // Add second image
    await addImageBtn.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    const urlInput2 = page.getByTestId("image-edit-url");
    await expect(urlInput2).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await urlInput2.fill(
      "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400",
    );
    const altInput2 = page.getByTestId("image-edit-alt");
    await altInput2.fill("Candy image 2");
    await page.getByTestId("image-edit-done").click();

    // Save the product
    await page.getByTestId("toolbar-save").click();
    await page.waitForURL(`${APP_URLS.STUDIO}/en`, {
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Extract product ID
    const productRow = page.getByTestId(/^product-row-/).first();
    await expect(productRow).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    const rowTestId = await productRow.getAttribute("data-testid");
    productId = rowTestId!.replace("product-row-", "");
  });

  // ─── Feature 1: Cover Image Selection ─────────────────────────

  test("Feature 1: Cover Image — star icons and cover selection", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en/products/${productId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("inline-image-carousel")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const desktopThumbs = page.getByTestId("image-gallery-thumbs");
    await expect(desktopThumbs).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Wait for both thumbnails
    const thumb0 = desktopThumbs.getByTestId("image-thumb-0");
    const thumb1 = desktopThumbs.getByTestId("image-thumb-1");
    await expect(thumb0).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await expect(thumb1).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Screenshot 1: Star icons visible on thumbnails (before setting cover)
    await snapElement(desktopThumbs, "cover-star-icons-on-thumbnails");

    // Set second image as cover
    const coverBtn1 = desktopThumbs.getByTestId("image-thumb-cover-1");
    await expect(coverBtn1).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await coverBtn1.click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Screenshot 2: Filled yellow star on cover image thumbnail
    const starIcon = coverBtn1.locator("svg");
    await expect(coverBtn1).toHaveAttribute("data-cover", "true");
    await snapElement(
      desktopThumbs,
      "cover-filled-yellow-star-on-second-image",
    );

    // Save the product
    await page.getByTestId("toolbar-save").click();
    await page.waitForURL(`${APP_URLS.STUDIO}/en`, {
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Screenshot 3: Product table row showing cover image
    const productRow = page.getByTestId(`product-row-${productId}`);
    await expect(productRow).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await snapElement(productRow, "cover-image-in-product-table-row");
  });

  // ─── Feature 2: Per-Product Delegate Management ───────────────

  test("Feature 2a: Delegate — manage button and badge in product table", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Screenshot 4: Product table showing "Manage Delegates" button (Users icon)
    const productRow = page.getByTestId(`product-row-${productId}`);
    await expect(productRow).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    const manageDelegatesBtn = page.getByTestId(
      `manage-delegates-${productId}`,
    );
    await expect(manageDelegatesBtn).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snapElement(productRow, "delegate-manage-button-in-actions-column");

    // Navigate to per-product delegates page
    await manageDelegatesBtn.click();
    await page.waitForURL(new RegExp(`/products/${productId}/delegates`), {
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    // Verify page loaded
    await expect(page.getByTestId("product-delegates-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(
      page.getByTestId("product-delegates-page").locator("h1"),
    ).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Add a delegate
    const searchInput = page.getByTestId("delegate-search-input");
    await searchInput.fill(delegate.email);
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    const searchResult = page.locator("ul li button").first();
    await expect(searchResult).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await searchResult.click();

    await page.getByTestId("delegate-permission-orders.approve").check();
    await page.getByTestId("delegate-permission-orders.request_proof").check();
    await page.getByTestId("delegate-add-submit").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Wait for delegate to appear in list
    const delegateItem = page.getByTestId(`delegate-item-${delegate.userId}`);
    await expect(delegateItem).toBeVisible({
      timeout: LONG_OPERATION_TIMEOUT_MS,
    });

    // Screenshot 5: Per-product delegates page with product name, delegate list, add form
    await snapPage(page, "delegate-per-product-page-with-delegate");
  });

  test("Feature 2b: Delegate — badge on product row after adding delegate", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Screenshot 6: Delegate badge (Users icon) next to product name
    const productRow = page.getByTestId(`product-row-${productId}`);
    await expect(productRow).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Wait for delegate badge to appear (async fetch)
    const delegateBadge = productRow.locator(
      'svg[aria-label], [aria-label*="delegate"], [aria-label*="Delegate"]',
    );
    await expect(delegateBadge.first()).toBeVisible({
      timeout: LONG_OPERATION_TIMEOUT_MS,
    });
    await snapElement(productRow, "delegate-badge-next-to-product-name");
  });

  // ─── Feature 3: GripVertical Drag Handle ──────────────────────

  test("Feature 3: GripVertical drag handles on desktop thumbnails", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);
    await page.goto(`${APP_URLS.STUDIO}/en/products/${productId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("inline-image-carousel")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const thumbGallery = page.getByTestId("image-gallery-thumbs");
    await expect(thumbGallery).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Verify GripVertical handles exist (at least 2 — one per image)
    const dragHandles = thumbGallery.locator("[aria-label]").filter({
      has: page.locator("svg"),
    });
    const handleCount = await dragHandles.count();
    expect(handleCount).toBeGreaterThanOrEqual(2);

    // Verify cursor-grab styling
    const firstHandle = dragHandles.first();
    await expect(firstHandle).toBeVisible();
    await expect(firstHandle).toHaveClass(/cursor-grab/);

    // Screenshot 7: Desktop thumbnails with GripVertical drag handles
    await snapElement(thumbGallery, "grip-vertical-drag-handles-on-thumbnails");
  });
});
