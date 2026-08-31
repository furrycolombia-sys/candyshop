import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const LANDING_URL = resolveE2EAppUrls().landing;

/**
 * Page-level accessibility.
 *
 * The unit-level axe suites in packages/ui and packages/app-components check
 * components in isolation. They cannot see what only exists once a page is
 * composed: colour contrast computed against the real theme, focus order
 * across a whole document, or a heading hierarchy assembled from several
 * components. That is what this covers.
 *
 * Landing first because its routes are public -- no session, no seeded data,
 * so a failure here is about the page and nothing else.
 */
const ROUTES = [
  { name: "home", path: "/en" },
  { name: "terms", path: "/en/legal/terms" },
  { name: "privacy", path: "/en/legal/privacy" },
];

for (const route of ROUTES) {
  test(`${route.name} has no WCAG 2 AA violations`, async ({ page }) => {
    await page.goto(`${LANDING_URL}${route.path}`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Name the rule and the element, so a failure is actionable from the log
    // alone rather than needing the run reproduced.
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}) on ${v.nodes.length}: ${v.help}`,
    );

    expect(summary, `${route.name} accessibility violations`).toEqual([]);
  });
}

test("dark mode keeps its contrast", async ({ page }) => {
  // Contrast is the violation class a component-level check cannot find, and
  // the one most likely to differ between themes.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`${LANDING_URL}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa"])
    .include("body")
    .analyze();

  const contrast = results.violations.filter((v) => v.id === "color-contrast");

  expect(
    contrast.map((v) => `${v.nodes.length} nodes: ${v.help}`),
    "dark mode contrast violations",
  ).toEqual([]);
});
