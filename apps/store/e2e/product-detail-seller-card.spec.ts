import path from "node:path";

import { test, expect } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const { store: STORE_URL } = resolveE2EAppUrls();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Product detail — seller card", () => {
  test("renders seller card when product has a seller", async ({ page }) => {
    const supabase = await getSupabaseAdmin();
    if (!supabase) return test.skip();

    const { data: product } = await supabase
      .from("products")
      .select("id, seller_id")
      .not("seller_id", "is", null)
      .limit(1)
      .single();

    if (!product) return test.skip();

    await page.goto(`${STORE_URL}/en/products/${product.id}`);

    await expect(page.getByTestId("seller-card")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("seller-card-title")).toBeVisible();

    const sellerName = page.getByTestId("seller-name");
    await expect(sellerName).toBeVisible();
    await expect(sellerName).not.toBeEmpty();

    const profileLink = page.getByTestId("seller-profile-link");
    await expect(profileLink).toBeVisible();
    await expect(profileLink).toHaveAttribute(
      "href",
      new RegExp(`/profile/${product.seller_id as string}`),
    );
  });

});
