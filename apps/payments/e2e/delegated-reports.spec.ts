import path from "node:path";
import { expect, test } from "@playwright/test";

import {
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

const DELEGATED_ORDER = {
  total: 50000,
  currency: "COP",
  payment_status: "approved",
  transfer_number: "E2E-DELEGATED-REPORT-DELEGATED",
  receipt_url: null,
};

const OTHER_ORDER = {
  total: 30000,
  currency: "COP",
  payment_status: "approved",
  transfer_number: "E2E-DELEGATED-REPORT-OTHER",
  receipt_url: null,
};

test.describe.serial("Delegated Reports page", () => {
  let sellerUser: TestUser;
  let delegateUser: TestUser;
  let buyerUser: TestUser;
  let delegatedProductId: string;
  let otherProductId: string;
  let delegatedOrderId: string;
  let otherOrderId: string;
  let delegationId: string;

  test.beforeAll(async () => {
    sellerUser = await createTestUser(
      "delegated-reports-seller",
      SELLER_PERMISSIONS,
    );
    delegateUser = await createTestUser("delegated-reports-delegate", []);
    buyerUser = await createTestUser("delegated-reports-buyer", []);

    const delegatedProduct = await adminInsert("products", {
      slug: `e2e-delegated-report-p1-${Date.now()}`,
      name_en: "Delegated Product",
      name_es: "Producto Delegado",
      description_en: "Delegated",
      description_es: "Delegado",
      type: "merch",
      price: 25000,
      currency: "COP",
      max_quantity: 5,
      seller_id: sellerUser.userId,
    });
    delegatedProductId = delegatedProduct.id as string;

    const otherProduct = await adminInsert("products", {
      slug: `e2e-delegated-report-p2-${Date.now()}`,
      name_en: "Other Product",
      name_es: "Otro Producto",
      description_en: "Not delegated",
      description_es: "No delegado",
      type: "merch",
      price: 15000,
      currency: "COP",
      max_quantity: 5,
      seller_id: sellerUser.userId,
    });
    otherProductId = otherProduct.id as string;

    const delegatedOrder = await adminInsert("orders", {
      ...DELEGATED_ORDER,
      user_id: buyerUser.userId,
      seller_id: sellerUser.userId,
    });
    delegatedOrderId = delegatedOrder.id as string;
    await adminInsert("order_items", {
      order_id: delegatedOrderId,
      product_id: delegatedProductId,
      quantity: 2,
      unit_price: 25000,
      currency: "COP",
    });

    const otherOrder = await adminInsert("orders", {
      ...OTHER_ORDER,
      user_id: buyerUser.userId,
      seller_id: sellerUser.userId,
    });
    otherOrderId = otherOrder.id as string;
    await adminInsert("order_items", {
      order_id: otherOrderId,
      product_id: otherProductId,
      quantity: 2,
      unit_price: 15000,
      currency: "COP",
    });

    // Delegate ONLY product P1 to the delegate, granting reports.read + reports.export.
    const delegation = await adminInsert("seller_admins", {
      seller_id: sellerUser.userId,
      admin_user_id: delegateUser.userId,
      product_id: delegatedProductId,
      permissions: ["reports.read", "reports.export"],
    });
    delegationId = delegation.id as string;
  });

  test.afterAll(async () => {
    await adminDelete("seller_admins", `id=eq.${delegationId}`).catch(() => {});
    await adminDelete("order_items", `order_id=eq.${delegatedOrderId}`).catch(
      () => {},
    );
    await adminDelete("order_items", `order_id=eq.${otherOrderId}`).catch(
      () => {},
    );
    await adminDelete("orders", `id=eq.${delegatedOrderId}`).catch(() => {});
    await adminDelete("orders", `id=eq.${otherOrderId}`).catch(() => {});
    await adminDelete("products", `id=eq.${delegatedProductId}`).catch(
      () => {},
    );
    await adminDelete("products", `id=eq.${otherProductId}`).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(buyerUser.userId).catch(() => {});
    await supabaseAdmin.auth.admin
      .deleteUser(delegateUser.userId)
      .catch(() => {});
    await supabaseAdmin.auth.admin
      .deleteUser(sellerUser.userId)
      .catch(() => {});
  });

  test("delegate sees the Delegated Reports menu and page", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/delegated-reports`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("sidebar-delegatedReports")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("delegated-reports-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });

  test("shows only delegated product orders, not other products", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/delegated-reports?status=approved`,
      {
        waitUntil: "networkidle",
      },
    );
    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: DELEGATED_ORDER.transfer_number }),
    ).toBeVisible({ timeout: MUTATION_WAIT_MS });

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: OTHER_ORDER.transfer_number }),
    ).not.toBeVisible();
  });

  test("delegate with reports.export can download the XLS", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/delegated-reports?status=approved`,
      {
        waitUntil: "networkidle",
      },
    );
    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const exportButton = page.getByTestId("delegated-reports-export-button");
    await expect(exportButton).toBeEnabled({ timeout: ELEMENT_TIMEOUT_MS });

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xls$/i);
  });

  test("delegate without reports.read sees no menu and no report page", async ({
    context,
    page,
  }) => {
    const noReportDelegate = await createTestUser(
      "delegated-reports-noperm",
      [],
    );
    const noReportDelegation = await adminInsert("seller_admins", {
      seller_id: sellerUser.userId,
      admin_user_id: noReportDelegate.userId,
      product_id: delegatedProductId,
      permissions: ["orders.approve"],
    });
    try {
      await injectSession(context, noReportDelegate);
      await page.goto(`${getPaymentsBaseUrl()}/en/delegated-reports`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(MUTATION_WAIT_MS);
      await expect(page.getByTestId("sidebar-delegatedReports")).toHaveCount(0);
      await expect(page.getByTestId("delegated-reports-page")).toHaveCount(0);
    } finally {
      await adminDelete(
        "seller_admins",
        `id=eq.${noReportDelegation.id}`,
      ).catch(() => {});
      await supabaseAdmin.auth.admin
        .deleteUser(noReportDelegate.userId)
        .catch(() => {});
    }
  });
});
