import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const { store: STORE_URL } = resolveE2EAppUrls();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Page-level accessibility for the storefront.
 *
 * apps/landing already covers this for the public marketing routes, and its
 * header explains why page level is not the same question as component level:
 * contrast computed against the real theme, focus order across a document, a
 * heading hierarchy assembled from several components. None of that exists
 * until a page is composed.
 *
 * Store adds what landing structurally cannot. Its e2e project carries a
 * signed-in session, so these routes render the authenticated navigation, the
 * cart, and a product page built from seeded data -- the parts of the app a
 * buyer actually spends time in, and the ones no public route exercises.
 */

/** Names the rule AND the offending element: a rule id and a node count says
 *  a contrast check failed without saying where, which is not actionable from
 *  a CI log, and a CI log is the only place this runs. */
function summarise(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.flatMap((v) =>
    v.nodes.map(
      (n) =>
        `${v.id} (${v.impact}) at ${n.target.join(" ")} -- ${n.failureSummary?.replace(/\s+/g, " ").trim()}`,
    ),
  );
}

test("catalog has no WCAG 2 AA violations", async ({ page }) => {
  await page.goto(`${STORE_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

  expect(summarise(results.violations), "catalog accessibility").toEqual([]);
});

test("product detail has no WCAG 2 AA violations", async ({ page }) => {
  // Reads a real product rather than a fixture: the page is assembled from
  // seeded content -- sections, galleries, badges -- and a hand-built fixture
  // would exercise a shape the store does not actually render.
  expect(
    SUPABASE_URL && SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY is required for this test",
  ).toBeTruthy();

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .limit(1)
    .single();

  test.skip(
    !product,
    "no product in the E2E database -- product detail accessibility not verified",
  );

  await page.goto(`${STORE_URL}/en/products/${product!.id}/x`);
  await expect(page.getByTestId("hero-section")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

  expect(summarise(results.violations), "product detail accessibility").toEqual(
    [],
  );
});

test("the cart drawer has no WCAG 2 AA violations", async ({ page }) => {
  // A drawer is where focus management and labelling usually go wrong, and it
  // does not exist in the DOM until it is opened -- so a route-level scan of
  // the catalog never sees it.
  await page.goto(`${STORE_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  await page.getByTestId("cart-drawer-trigger").first().click();
  await expect(page.getByTestId("cart-drawer-items")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

  expect(summarise(results.violations), "cart drawer accessibility").toEqual(
    [],
  );
});

test("dark mode keeps its contrast", async ({ page }) => {
  // Contrast is the class a component-level check cannot find, and the one
  // most likely to differ between themes.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`${STORE_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa"])
    .include("body")
    .analyze();

  const contrast = results.violations.filter((v) => v.id === "color-contrast");

  expect(summarise(contrast), "dark mode contrast").toEqual([]);
});
