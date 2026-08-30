import fs from "node:fs";
import path from "node:path";

import { test, expect, type Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

const {
  store: STORE_URL,
  studio: STUDIO_URL,
  payments: PAYMENTS_URL,
} = resolveE2EAppUrls();

const NAV_APPS = [
  { name: "store", url: STORE_URL },
  { name: "studio", url: STUDIO_URL },
  { name: "payments", url: PAYMENTS_URL },
];

const USER_FILE = path.resolve(__dirname, ".auth/user.json");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  if (error && error.code !== "23505")
    throw new Error(`Failed to grant '${key}': ${error.message}`);
}

async function revokeAllPermissions(): Promise<void> {
  await supabaseAdmin.from("user_permissions").delete().eq("user_id", userId);
}

const PERM_PATTERN = /\/rest\/v1\/(user_permissions|seller_admins)/;

/**
 * Navigate to `url/en`, hold the permission API calls until a MutationObserver
 * is installed on the nav, then release. Returns:
 *
 * - `studioVisibleBeforeApi` — whether `nav-link-studio` was visible while the
 *   API was still blocked (i.e., the pre-API render state driven solely by the
 *   nav-perm cookie). A false value when true was expected indicates a flicker:
 *   the nav rendered without the cookie state before the API returned.
 *
 * - `mutations` — DOM mutations observed on the nav element after both Supabase
 *   responses complete. 0 = stable (cookie matched API). >0 = re-rendered
 *   (cookie was stale, API caused an update).
 */
async function navStateAfterFetch(
  page: Page,
  url: string,
): Promise<{ studioVisibleBeforeApi: boolean; mutations: number }> {
  // Register response watchers before navigating so we don't race.
  const r1 = page.waitForResponse(
    (r) => PERM_PATTERN.test(r.url()) && r.url().includes("user_permissions"),
    { timeout: 15_000 },
  );
  const r2 = page.waitForResponse(
    (r) => PERM_PATTERN.test(r.url()) && r.url().includes("seller_admins"),
    { timeout: 15_000 },
  );

  // Hold permission API calls until the observer is installed.
  let releaseAPI!: () => void;
  const apiReady = new Promise<void>((resolve) => {
    releaseAPI = resolve;
  });
  await page.route(PERM_PATTERN, async (route) => {
    await apiReady;
    await route.continue();
  });

  await page.goto(`${url}/en`);
  await expect(page.getByTestId("app-navigation")).toBeVisible();

  // ── Flicker check ─────────────────────────────────────────────────────────
  // The API is still blocked here. The nav renders from the nav-perm cookie
  // via useLayoutEffect. We give React up to 1 s to hydrate and run
  // useLayoutEffect (which seeds hasCachedPermissions from the cookie) before
  // sampling the link's visibility. Any link that appears in this window is
  // driven purely by the cookie — the route handler is still holding the API.
  let studioVisibleBeforeApi = false;
  try {
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 1_000,
    });
    studioVisibleBeforeApi = true;
  } catch {
    studioVisibleBeforeApi = false;
  }

  // Install MutationObserver while API calls are still queued.
  await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="app-navigation"]');
    if (!nav) return;
    (window as unknown as Record<string, unknown>).__navMutCount = 0;
    const obs = new MutationObserver(() => {
      (window as unknown as Record<string, unknown>).__navMutCount =
        ((window as unknown as Record<string, unknown>)
          .__navMutCount as number) + 1;
    });
    obs.observe(nav, { subtree: true, childList: true, attributes: true });
    (window as unknown as Record<string, unknown>).__navObs = obs;
  });

  // Let the API calls through.
  releaseAPI();

  // Wait for both permission responses to complete.
  await Promise.all([r1, r2]);

  // Give React one tick to flush any resulting state updates.
  // This measures that NOTHING happens: the navbar must not re-render when the
  // permission responses resolve. A negative assertion has no positive event to
  // await, and waiting only until the mutation counter goes quiet would stop
  // watching before late flicker -- so a fixed settle window is the right tool.
  // eslint-disable-next-line playwright/no-wait-for-timeout -- see above
  await page.waitForTimeout(500);

  const mutations = await page.evaluate(
    () =>
      ((window as unknown as Record<string, unknown>)
        .__navMutCount as number) ?? 0,
  );

  await page.unroute(PERM_PATTERN);
  return { studioVisibleBeforeApi, mutations };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

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
  await revokeAllPermissions();
});

// ── Test ──────────────────────────────────────────────────────────────────────

test.describe("Navbar permission caching across apps", () => {
  test("nav is stable across apps when permissions unchanged, re-renders once on permission change, then stable again", async ({
    page,
  }) => {
    // ── Phase 1: Grant permissions and seed the nav-perm cookie ────────────
    await grantPermission("products.create");

    // Navigate to the first app so the hook fetches permissions and writes
    // the cookie. Wait until the studio link is visible to confirm the cookie
    // was written with the new permission set.
    await page.goto(`${NAV_APPS[0]!.url}/en`);
    await expect(page.getByTestId("nav-link-studio")).toBeVisible({
      timeout: 10_000,
    });

    // ── Phase 2: Navigate all apps — cookie matches API → stable nav ───────
    //
    // Both checks must pass for each app:
    //   studioVisibleBeforeApi=true  → no initial-render flicker (nav renders
    //                                  correctly from cookie before API returns)
    //   mutations=0                  → no post-API flicker (API response didn't
    //                                  cause the nav to re-render)
    for (const app of NAV_APPS) {
      const { studioVisibleBeforeApi, mutations } = await navStateAfterFetch(
        page,
        app.url,
      );
      expect(
        studioVisibleBeforeApi,
        `[flicker] ${app.name}: studio link must be visible from cookie BEFORE the API returns`,
      ).toBe(true);
      expect(
        mutations,
        `[stable] ${app.name}: permissions unchanged — expected 0 nav mutations after API fetch`,
      ).toBe(0);
    }

    // ── Phase 3: Revoke permissions server-side ────────────────────────────
    await revokeAllPermissions();

    // ── Phase 4: First app — cookie is stale → nav must re-render ──────────
    //
    // The cookie still says studio is granted, so studioVisibleBeforeApi=true.
    // After the API returns empty permissions, the nav re-renders (mutations>0)
    // and the studio link disappears.
    const {
      studioVisibleBeforeApi: studioBeforeRevoke,
      mutations: firstMutations,
    } = await navStateAfterFetch(page, NAV_APPS[0]!.url);
    expect(
      studioBeforeRevoke,
      `[phase 4] ${NAV_APPS[0]!.name}: old cookie should still show studio link before API returns`,
    ).toBe(true);
    expect(
      firstMutations,
      `[re-render] ${NAV_APPS[0]!.name}: stale cookie — expected nav mutations after API fetch`,
    ).toBeGreaterThan(0);
    // Confirm the studio link is now gone (permissions were revoked).
    await expect(page.getByTestId("nav-link-studio")).not.toBeVisible({
      timeout: 5_000,
    });

    // ── Phase 5: Remaining apps — cookie updated → stable nav ──────────────
    //
    // After phase 4 the cookie was rewritten to reflect empty permissions.
    // studioVisibleBeforeApi=false  → nav correctly shows no studio from cookie
    // mutations=0                   → API matches cookie, no re-render needed
    for (const app of NAV_APPS.slice(1)) {
      const { studioVisibleBeforeApi, mutations } = await navStateAfterFetch(
        page,
        app.url,
      );
      expect(
        studioVisibleBeforeApi,
        `[flicker] ${app.name}: studio link must NOT appear from cookie (permissions revoked)`,
      ).toBe(false);
      expect(
        mutations,
        `[stable after update] ${app.name}: cookie updated — expected 0 nav mutations after API fetch`,
      ).toBe(0);
    }
  });
});
