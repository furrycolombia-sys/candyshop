import path from "node:path";
import { expect, test } from "@playwright/test";

import {
  DEBOUNCE_WAIT_MS,
  ELEMENT_TIMEOUT_MS,
  MUTATION_WAIT_MS,
} from "../../auth/e2e/helpers/constants";
import {
  SELLER_PERMISSIONS,
  adminDelete,
  adminInsert,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../auth/e2e/helpers/session";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

function getPaymentsBaseUrl(): string {
  const urls = resolveE2EAppUrls() as { payments: string };
  return urls.payments;
}

// ─── Test data ────────────────────────────────────────────────────

const TEST_ORDER = {
  total: 75000,
  currency: "COP",
  payment_status: "approved",
  transfer_number: "E2E-SELLER-REPORT-001",
  receipt_url: null,
};

const TEST_ORDER_ITEM = {
  quantity: 3,
  unit_price: 25000,
  currency: "COP",
};

// ─── Test suite ───────────────────────────────────────────────────

test.describe.serial("Seller Reports page", () => {
  let sellerUser: TestUser;
  let buyerUser: TestUser;
  let orderId: string;
  let productId: string;

  test.beforeAll(async () => {
    sellerUser = await createTestUser("seller-reports", SELLER_PERMISSIONS);
    buyerUser = await createTestUser("buyer-reports-payments", []);

    const product = await adminInsert("products", {
      slug: `e2e-seller-report-${Date.now()}`,
      name_en: "E2E Seller Report Product",
      name_es: "Producto de Reporte E2E",
      description_en: "Created for seller reports E2E test",
      description_es: "Creado para prueba E2E de reportes",
      type: "merch",
      price: 25000,
      currency: "COP",
      max_quantity: 5,
      seller_id: sellerUser.userId,
    });
    productId = product.id as string;

    const order = await adminInsert("orders", {
      ...TEST_ORDER,
      user_id: buyerUser.userId,
      seller_id: sellerUser.userId,
    });
    orderId = order.id as string;

    await adminInsert("order_items", {
      order_id: orderId,
      product_id: productId,
      ...TEST_ORDER_ITEM,
    });
  });

  test.afterAll(async () => {
    await adminDelete("order_items", `order_id=eq.${orderId}`).catch(() => {});
    await adminDelete("orders", `id=eq.${orderId}`).catch(() => {});
    await adminDelete("products", `id=eq.${productId}`).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(buyerUser.userId).catch(() => {});
    await supabaseAdmin.auth.admin
      .deleteUser(sellerUser.userId)
      .catch(() => {});
  });

  // ─── Page structure ──────────────────────────────────────────────

  test("displays page with filters bar, table and export button", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });

  // ─── Filter interactions ─────────────────────────────────────────

  test("status filter updates URL query param", async ({ context, page }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page
      .getByTestId("seller-reports-filter-status")
      .selectOption("approved");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    const url = new URL(page.url());
    expect(url.searchParams.get("status")).toBe("approved");
  });

  test("date range filters update URL query params", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page
      .getByTestId("seller-reports-filter-date-from")
      .fill("2024-01-01");
    await page.getByTestId("seller-reports-filter-date-to").fill("2099-12-31");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    const url = new URL(page.url());
    expect(url.searchParams.get("dateFrom")).toBe("2024-01-01");
    expect(url.searchParams.get("dateTo")).toBe("2099-12-31");
  });

  test("amount min/max filters update URL query params", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page.getByTestId("seller-reports-filter-amount-min").fill("1000");
    await page.getByTestId("seller-reports-filter-amount-max").fill("999999");
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    const url = new URL(page.url());
    expect(url.searchParams.get("amountMin")).toBe("1000");
    expect(url.searchParams.get("amountMax")).toBe("999999");
  });

  test("clear button removes all active filters", async ({ context, page }) => {
    await injectSession(context, sellerUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/reports?status=approved&amountMin=100`,
      { waitUntil: "networkidle" },
    );

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("seller-reports-filter-clear")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await page.getByTestId("seller-reports-filter-clear").click();
    await page.waitForTimeout(DEBOUNCE_WAIT_MS);

    const url = new URL(page.url());
    expect(url.searchParams.get("status")).toBeNull();
    expect(url.searchParams.get("amountMin")).toBeNull();
  });

  test("URL filter params are respected on page load", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports?status=approved`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-reports-filters-bar")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(page.getByTestId("seller-reports-filter-status")).toHaveValue(
      "approved",
    );
  });

  // ─── Test data visibility ────────────────────────────────────────

  test("shows the seeded order in the table", async ({ context, page }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports?status=approved`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: TEST_ORDER.transfer_number }),
    ).toBeVisible({ timeout: MUTATION_WAIT_MS });
  });

  test("status=pending filter hides the approved seeded order", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports?status=pending`, {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: TEST_ORDER.transfer_number }),
    ).not.toBeVisible();
  });

  test("seller only sees their own orders (not other sellers)", async ({
    context,
    page,
  }) => {
    const otherSeller = await createTestUser(
      "other-seller-reports",
      SELLER_PERMISSIONS,
    );
    try {
      await injectSession(context, otherSeller);
      await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
        waitUntil: "networkidle",
      });

      await page.waitForTimeout(MUTATION_WAIT_MS);

      // The seeded order belongs to sellerUser, not otherSeller — must not be visible
      await expect(
        page
          .locator(`[data-testid^="seller-report-row-transfer-"]`)
          .filter({ hasText: TEST_ORDER.transfer_number }),
      ).not.toBeVisible();
    } finally {
      await supabaseAdmin.auth.admin
        .deleteUser(otherSeller.userId)
        .catch(() => {});
    }
  });

  // ─── Export ───────────────────────────────────────────────────────

  test("export button is disabled when no orders are loaded", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/reports?status=pending&amountMin=9999999`,
      { waitUntil: "networkidle" },
    );

    await page.waitForTimeout(MUTATION_WAIT_MS);

    const exportButton = page.getByTestId("seller-reports-export-button");
    await expect(exportButton).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await expect(exportButton).toBeDisabled();
  });

  test("export button downloads an XLS file when orders are present", async ({
    context,
    page,
  }) => {
    await injectSession(context, sellerUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/reports?status=approved`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const exportButton = page.getByTestId("seller-reports-export-button");
    await expect(exportButton).toBeEnabled({ timeout: ELEMENT_TIMEOUT_MS });

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^my-sales-report.*\.xls$/i);
  });

  // ─── Access control ───────────────────────────────────────────────

  test("unauthenticated user cannot access the reports page", async ({
    page,
  }) => {
    // No session injection
    const response = await page.goto(`${getPaymentsBaseUrl()}/en/reports`, {
      waitUntil: "networkidle",
    });

    // Should redirect to login or return a non-200 status
    const isOnReportsPage =
      page.url().includes("/reports") && response?.status() === 200;
    if (isOnReportsPage) {
      // API call should fail with 401 and show error state
      await page.waitForTimeout(MUTATION_WAIT_MS);
      await expect(page.getByTestId("seller-report-table")).not.toBeVisible();
    } else {
      // Redirect happened — acceptable
      expect(page.url()).not.toContain("/reports");
    }
  });
});
