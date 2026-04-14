import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import { APP_URLS, ELEMENT_TIMEOUT_MS } from "./helpers/constants";
import {
  adminInsert,
  createTestUser,
  injectSession,
  type TestUser,
} from "./helpers/session";

function buildSharedCookieDomain(url: string) {
  const host = new URL(url).hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return host;
  }

  const parts = host.split(".");
  return `.${parts.slice(-2).join(".")}`;
}

test.describe.serial("Checkout stock integrity", () => {
  let seller: TestUser;
  let buyer: TestUser;
  let productId: string;
  let sellerId: string;

  test.beforeAll(async () => {
    seller = await createTestUser("stock-seller");
    buyer = await createTestUser("stock-buyer");
    sellerId = seller.userId;

    const product = await adminInsert("products", {
      seller_id: seller.userId,
      slug: `stock-guard-${Date.now()}`,
      name_en: "Stock Guard Product",
      name_es: "Producto Stock Guard",
      description_en: "Checkout stock guard product",
      description_es: "Producto para validar stock en checkout",
      type: "merch",
      category: "merch",
      price_cop: 10000,
      price_usd: 3,
      max_quantity: 1,
      is_active: true,
      images: [],
      sections: [],
      tags: [],
      sort_order: 0,
      featured: false,
    });
    productId = String(product.id);

    await adminInsert("seller_payment_methods", {
      seller_id: seller.userId,
      name_en: "Stock Guard Method",
      name_es: "Método Stock Guard",
      display_blocks: [
        { id: "b1", type: "text", content: "Sensitive Account 123" },
      ],
      form_fields: [
        {
          id: "f1",
          type: "text",
          label: "Reference",
          required: true,
          placeholder: "",
        },
      ],
      is_active: true,
      sort_order: 0,
    });
  });

  test.afterAll(async () => {
    if (seller && buyer) {
      await cleanupTestData(seller.userId, buyer.userId);
    }
  });

  test("checkout hides payment information and backend returns none for an overstocked cart", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    const sharedDomain = buildSharedCookieDomain(APP_URLS.PAYMENTS);
    const isLocalhost =
      sharedDomain === "localhost" || sharedDomain === "127.0.0.1";

    await context.addCookies([
      {
        name: "candystore-cart",
        value: JSON.stringify([
          {
            id: productId,
            name_en: "Stock Guard Product",
            name_es: "Producto Stock Guard",
            price_cop: 10000,
            price_usd: 3,
            seller_id: sellerId,
            quantity: 2,
            images: [],
            max_quantity: 1,
          },
        ]),
        domain: sharedDomain,
        path: "/",
        httpOnly: false,
        secure: !isLocalhost,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId(/^seller-checkout-/).first()).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(
      page.getByTestId(/^seller-checkout-error-/).first(),
    ).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });
    await expect(page.getByTestId("payment-method-select")).not.toBeVisible();
    await expect(page.getByTestId(/^submit-payment-/)).not.toBeVisible();
    await expect(page.getByTestId(/^display-block-/)).not.toBeVisible();
    await expect(page.getByTestId(/^dynamic-field-/)).not.toBeVisible();

    const apiResponse = await page.evaluate(
      async (payload) => {
        // Derive basePath from current URL (e.g. /payments in Docker)
        const basePath = window.location.pathname.startsWith("/payments")
          ? "/payments"
          : "";
        const response = await fetch(
          `${basePath}/api/checkout/payment-methods`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        return {
          status: response.status,
          body: await response.json(),
        };
      },
      {
        sellerId,
        items: [{ id: productId, quantity: 2 }],
      },
    );

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body).toEqual({
      hasStockIssues: true,
      methods: [],
    });
  });
});
