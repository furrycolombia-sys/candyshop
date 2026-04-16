import path from "node:path";

import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- shared Node helper
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../../scripts/app-url-resolver.js"),
);

/**
 * Encode a string as base64url (URL-safe base64, no padding).
 * @supabase/ssr uses base64url encoding for cookie values — standard btoa()
 * produces base64 with +/= chars that @supabase/ssr's stringFromBase64URL
 * will reject as invalid characters.
 */
function toBase64URL(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL)
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not set. Ensure the correct .env.* file is loaded.",
  );

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY)
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Ensure the correct .env.* file is loaded.",
  );

const AUTH_URL = resolveE2EAppUrls().auth;

export const hasAdminTestEnv = SERVICE_ROLE_KEY.split(".").length === 3;

/** Session token lifetime in seconds for injected cookies. */
export const SESSION_EXPIRY_SECONDS = 3600;

/**
 * Derive the shared cookie domain from an app URL.
 * For localhost/127.0.0.1, returns the hostname as-is.
 * For production domains, returns the root domain with a leading dot.
 */
export function buildSharedCookieDomain(url: string): string {
  const host = new URL(url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return host;
  const parts = host.split(".");
  return `.${parts.slice(-2).join(".")}`;
}

/** Reusable headers for admin REST API calls. */
function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Direct REST helper for data operations that need to bypass RLS.
 * The JS client with sb_secret_ keys doesn't bypass RLS for PostgREST,
 * but raw REST API calls with the same key do.
 */
export async function adminInsert(
  table: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: adminHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Admin insert into ${table} failed: ${err.message}`);
  }
  const rows = await res.json();
  return rows[0];
}

/**
 * Direct REST helper for querying data as admin.
 */
export async function adminQuery(
  table: string,
  params: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Admin query on ${table} failed: ${err.message}`);
  }
  return res.json();
}

/**
 * Direct REST helper for deleting data as admin.
 */
export async function adminDelete(
  table: string,
  params: string,
): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Admin delete on ${table} failed: ${err.message}`);
  }
}

// ─── Permission Templates ────────────────────────────────────────

export const BUYER_PERMISSIONS = [
  "products.read",
  "product_images.read",
  "product_reviews.create",
  "product_reviews.read",
  "product_reviews.update",
  "product_reviews.delete",
  "orders.create",
  "orders.read",
  "receipts.create",
  "receipts.delete",
];

export const SELLER_PERMISSIONS = [
  "products.read",
  "product_images.read",
  "product_reviews.read",
  "orders.read",
  "receipts.read",
  "products.create",
  "products.update",
  "products.delete",
  "product_images.create",
  "product_images.delete",
  "orders.update",
  "seller_payment_methods.create",
  "seller_payment_methods.read",
  "seller_payment_methods.update",
  "seller_payment_methods.delete",
  "seller_admins.create",
  "seller_admins.read",
  "seller_admins.update",
  "seller_admins.delete",
];

export const ADMIN_PERMISSIONS = [
  ...new Set([
    ...BUYER_PERMISSIONS,
    ...SELLER_PERMISSIONS,
    "payment_settings.read",
    "payment_settings.update",
    "templates.create",
    "templates.read",
    "templates.update",
    "templates.delete",
    "audit.read",
    "user_permissions.create",
    "user_permissions.read",
    "user_permissions.update",
    "user_permissions.delete",
    "events.create",
    "events.read",
    "events.update",
    "events.delete",
    "check_ins.create",
    "check_ins.read",
    "check_ins.update",
    "orders.approve",
    "orders.request_proof",
  ]),
];

/**
 * Grant a list of permission keys to a user via admin REST API.
 */
export async function grantPermissions(
  userId: string,
  permissionKeys: string[],
): Promise<void> {
  const allRps = await adminQuery(
    "resource_permissions",
    "resource_type=eq.global&select=id,permissions!inner(key)",
  );

  for (const key of permissionKeys) {
    const rp = allRps.find(
      (r: Record<string, unknown>) =>
        (r.permissions as Record<string, unknown>).key === key,
    );
    if (!rp) continue;

    try {
      await adminInsert("user_permissions", {
        user_id: userId,
        resource_permission_id: rp.id,
        mode: "grant",
        granted_by: userId,
        reason: "E2E test setup",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "user_permissions_user_id_resource_permission_id_key",
        )
      ) {
        continue;
      }

      throw error;
    }
  }
}

// ─── Types ───────────────────────────────────────────────────────

export interface TestUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a test user via Supabase admin API.
 * Returns user info + tokens (does NOT inject cookies).
 */
export async function createTestUser(
  label: string,
  permissions: string[] = [],
): Promise<TestUser> {
  if (!hasAdminTestEnv) {
    throw new Error(
      "E2E admin setup is unavailable. Start local Supabase or configure a valid SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const email = `e2e-${label}-${Date.now()}@test.invalid`;
  const password = `test-${Date.now()}-${label}`;

  const { data: user, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError)
    throw new Error(`Failed to create ${label} user: ${createError.message}`);

  const { data: session, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInError)
    throw new Error(`Failed to sign in ${label} user: ${signInError.message}`);

  const testUser: TestUser = {
    userId: user.user!.id,
    email,
    accessToken: session.session!.access_token,
    refreshToken: session.session!.refresh_token,
  };

  if (permissions.length > 0) {
    await grantPermissions(testUser.userId, permissions);
  }

  return testUser;
}

/**
 * Inject a user's session cookies into the browser context.
 * Call this to "switch" to a different user.
 */
export async function injectSession(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  // Derive project ref from SUPABASE_URL (already resolved from env file above).
  // Must match SUPABASE_COOKIE_KEY in packages/api/src/supabase/config.ts
  // which uses deriveProjectRef: 127.0.0.1 → "127.0.0.1", localhost → "localhost"
  const refHostname = new URL(SUPABASE_URL).hostname;
  const projectRef =
    refHostname === "localhost" || refHostname === "127.0.0.1"
      ? refHostname
      : refHostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;
  const sharedDomain = buildSharedCookieDomain(AUTH_URL);
  const isLocalhost =
    sharedDomain === "localhost" || sharedDomain === "127.0.0.1";

  // Clear existing auth cookies first
  const cookies = await context.cookies();
  const hasAuthCookies = cookies.some((c) => c.name.startsWith("sb-"));
  if (hasAuthCookies) {
    await context.clearCookies();
  }

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${toBase64URL(
        JSON.stringify({
          access_token: user.accessToken,
          refresh_token: user.refreshToken,
          token_type: "bearer",
          expires_in: SESSION_EXPIRY_SECONDS,
          expires_at: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
          user: { id: user.userId, email: user.email },
        }),
      )}`,
      domain: sharedDomain,
      path: "/",
      httpOnly: false,
      secure: !isLocalhost,
      sameSite: "Lax",
    },
  ]);
}
