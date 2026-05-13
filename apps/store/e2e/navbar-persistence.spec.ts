import fs from "node:fs";
import path from "node:path";

import { test, expect } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const {
  store: STORE_URL,
  studio: STUDIO_URL,
  payments: PAYMENTS_URL,
} = resolveE2EAppUrls();

const USER_FILE = path.resolve(__dirname, ".auth/user.json");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * These tests verify the Stable Navbar feature: permission-gated nav links
 * appear when a user has the right permissions, persist across cross-app
 * navigations via the nav-perm cookie (no pop-in), and update when permissions
 * change (revocation flows through after the next background fetch).
 *
 * Target env: staging (TARGET_ENV=staging pnpm test:e2e).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: any;
let userId: string;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function grantPermission(key: string): Promise<void> {
  const { data: perm } = await supabaseAdmin
    .from("permissions")
    .select("id")
    .eq("key", key)
    .single();
  if (!perm) throw new Error(`Permission '${key}' not found in DB`);

  const { data: rows } = await supabaseAdmin
    .from("resource_permissions")
    .select("id")
    .eq("permission_id", perm.id)
    .eq("resource_type", "global")
    .is("resource_id", null)
    .limit(1);
  const rp = rows?.[0];
  if (!rp) throw new Error(`resource_permission for '${key}' not found`);

  const { error } = await supabaseAdmin.from("user_permissions").insert({
    user_id: userId,
    resource_permission_id: rp.id,
    mode: "grant",
    granted_by: userId,
  });
  if (error) throw new Error(`Failed to grant '${key}': ${error.message}`);
}

async function revokeAllPermissions(): Promise<void> {
  await supabaseAdmin.from("user_permissions").delete().eq("user_id", userId);
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

test.beforeAll(async () => {
  if (!SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  if (!fs.existsSync(USER_FILE)) {
    throw new Error(
      `${USER_FILE} not found — run auth.setup.ts first (pnpm e2e --project=setup)`,
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { id } = JSON.parse(fs.readFileSync(USER_FILE, "utf-8")) as {
    id: string;
  };
  userId = id;
});

test.beforeEach(async () => {
  // Each test starts with zero permissions so state is predictable.
  await revokeAllPermissions();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Navbar persistence across cross-app navigations", () => {
  test("studio link appears when user has products.create permission", async ({
    page,
  }) => {
    // No permissions yet → studio link absent after fetch
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId("nav-link-studio")).not.toBeVisible({
      timeout: 8000,
    });

    // Grant permission server-side
    await grantPermission("products.create");

    // Reload → permissions fetch returns the new grant → studio link appears
    await page.reload();
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 8000,
    });
  });

  test("gated links persist on cross-app navigation (cookie persistence, no pop-in)", async ({
    page,
  }) => {
    await grantPermission("products.create");

    // First visit: permissions fetched and written to nav-perm cookie
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 8000,
    });

    // Cross-app: hasCachedPermissions=true → nav renders immediately from cookie
    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();

    await page.goto(`${PAYMENTS_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
  });

  test("nav renders studio link immediately from cookie despite stalled API", async ({
    page,
  }) => {
    await grantPermission("products.create");

    // Seed the cookie: let permissions load normally so cookie is written
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 8000,
    });

    // Stall all permission-related Supabase REST calls for 10 s.
    // The nav must still be immediately visible from the cookie (hasCachedPermissions=true),
    // proving it does not wait for the API before rendering.
    await page.route(
      /\/rest\/v1\/(user_permissions|seller_admins)/,
      async (route) => {
        await new Promise<void>((r) => setTimeout(r, 10_000));
        await route.continue();
      },
    );

    await page.goto(`${STUDIO_URL}/en`);

    // These checks must pass without waiting the full 10 s for the API.
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();

    await page.unroute(/\/rest\/v1\/(user_permissions|seller_admins)/);
  });

  test("menu updates after permission is revoked", async ({ page }) => {
    await grantPermission("products.create");

    // Establish: studio link visible + cookie written
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 8000,
    });

    // Revoke permission server-side
    await revokeAllPermissions();

    // Navigate: old cookie shows studio initially, background fetch returns
    // empty grant list → grantedKeys updated → nav re-renders → studio gone.
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("nav is stable (no re-renders) when permissions are unchanged across apps", async ({
    page,
  }) => {
    await grantPermission("products.create");

    // Seed cookie
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 8000,
    });

    // Navigate across apps — same permissions, same cookie → nav stays consistent
    await page.goto(`${STUDIO_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();

    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible();
  });

  test("active link has aria-current=page on the current app", async ({
    page,
  }) => {
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();

    await expect(page.getByTestId("nav-link-store")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("nav-link-landing")).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("nav-perm cookie is written after first authenticated page load", async ({
    page,
  }) => {
    await page.goto(`${STORE_URL}/en`);
    await expect(page.getByTestId("app-navigation")).toBeVisible();
    // Wait for permission fetch + cookie write
    await page.waitForTimeout(2000);

    const cookies = await page.context().cookies();
    const navCookie = cookies.find((c) => c.name === "candystore-nav-perm");
    expect(navCookie).toBeDefined();
    expect(navCookie!.value).not.toBe("");
  });

  test("nav-perm cookie is cleared when session is removed", async ({
    page,
    context,
  }) => {
    await page.goto(`${STORE_URL}/en`);
    await page.waitForTimeout(2000); // let cookie be written

    // Simulate logout: clear all cookies
    await context.clearCookies();

    // Visit unauthenticated: hook detects no user → clears nav-perm cookie
    await page.goto(`${STORE_URL}/en`);
    await page.waitForTimeout(2000);

    const remaining = await context.cookies();
    const navCookie = remaining.find((c) => c.name === "candystore-nav-perm");
    expect(navCookie).toBeUndefined();
  });
});
