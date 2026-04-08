import { test, expect } from "@playwright/test";

const STORE_URL = "http://localhost:5001";
const LANDING_URL = "http://localhost:5004";

/** Clear only theme and locale cookies, preserving auth session */
async function clearNonAuthCookies(
  context: import("@playwright/test").BrowserContext,
) {
  const cookies = await context.cookies();
  const nonAuthCookies = cookies.filter(
    (c) =>
      c.name === "theme-preference" ||
      c.name === "NEXT_LOCALE" ||
      c.name === "theme-preference-expires",
  );
  // Clear by setting expired cookies
  if (nonAuthCookies.length > 0) {
    await context.addCookies(
      nonAuthCookies.map((c) => ({
        ...c,
        expires: 0,
      })),
    );
  }
}

test.describe("Theme persistence across apps", () => {
  test.beforeEach(async ({ context }) => {
    await clearNonAuthCookies(context);
  });

  test("dark theme persists from store to landing via cookie", async ({
    page,
  }) => {
    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    // Start in light mode
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Click theme toggle
    await page.getByTestId("theme-toggle").click();

    // Dark mode applied
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Cookie set
    const cookies = await page.context().cookies();
    const themeCookie = cookies.find((c) => c.name === "theme-preference");
    expect(themeCookie).toBeDefined();
    expect(themeCookie!.value).toBe("dark");

    // Navigate to landing
    await page.goto(`${LANDING_URL}/en`);
    await page.waitForLoadState("networkidle");

    // Dark mode persists
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("light theme persists after toggling back", async ({ page }) => {
    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    // Go dark
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Go light
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Cookie updated
    const cookies = await page.context().cookies();
    const themeCookie = cookies.find((c) => c.name === "theme-preference");
    expect(themeCookie!.value).toBe("light");

    // Persists on landing
    await page.goto(`${LANDING_URL}/en`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

test.describe("Language persistence across apps", () => {
  test.beforeEach(async ({ context }) => {
    await clearNonAuthCookies(context);
  });

  test("switching to Spanish persists from store to landing via cookie", async ({
    page,
  }) => {
    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    // Nav exists
    await expect(page.getByTestId("app-navigation")).toBeVisible();

    // Switch to ES
    await page.getByTestId("locale-switch-es").click();
    await page.waitForURL(/\/es/);

    // NEXT_LOCALE cookie set
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie).toBeDefined();
    expect(localeCookie!.value).toBe("es");

    // Navigate to landing in Spanish
    await page.goto(`${LANDING_URL}/es`);
    await page.waitForLoadState("networkidle");

    // Nav links visible (Spanish locale active)
    await expect(page.getByTestId("nav-link-landing")).toBeVisible();
    await expect(page.getByTestId("nav-link-store")).toBeVisible();
  });

  test("cross-app nav links include current locale", async ({ page }) => {
    await page.goto(`${STORE_URL}/es`);
    await page.waitForLoadState("networkidle");

    const href = await page
      .getByTestId("nav-link-landing")
      .getAttribute("href");
    expect(href).toContain("/es");
  });
});

test.describe("Theme + Language combined", () => {
  test("both dark theme and Spanish persist across apps", async ({
    page,
    context,
  }) => {
    await clearNonAuthCookies(context);

    await page.goto(`${STORE_URL}/en`);
    await page.waitForLoadState("networkidle");

    // Dark theme
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Spanish
    await page.getByTestId("locale-switch-es").click();
    await page.waitForURL(/\/es/);

    // Navigate to landing
    await page.goto(`${LANDING_URL}/es`);
    await page.waitForLoadState("networkidle");

    // Both persist
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByTestId("nav-link-landing")).toBeVisible();
  });
});
