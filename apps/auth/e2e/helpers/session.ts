import path from "node:path";

import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS loader script
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
loadRootEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Session token lifetime in seconds for injected cookies. */
const SESSION_EXPIRY_SECONDS = 3600;

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
];

export const ADMIN_PERMISSIONS = [
  ...new Set([
    ...BUYER_PERMISSIONS,
    ...SELLER_PERMISSIONS,
    "payment_method_types.create",
    "payment_method_types.read",
    "payment_method_types.update",
    "payment_method_types.delete",
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

    await adminInsert("user_permissions", {
      user_id: userId,
      resource_permission_id: rp.id,
      mode: "grant",
      granted_by: userId,
      reason: "E2E test setup",
    });
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
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;
  const authHost = new URL(
    process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:5000",
  );
  const isLocalhost =
    authHost.hostname === "localhost" || authHost.hostname === "127.0.0.1";
  const hostParts = authHost.hostname.split(".");
  const sharedDomain =
    !isLocalhost && hostParts.length >= 2
      ? `.${hostParts.slice(-2).join(".")}`
      : authHost.hostname;

  // Clear existing auth cookies first
  const cookies = await context.cookies();
  const hasAuthCookies = cookies.some((c) => c.name.startsWith("sb-"));
  if (hasAuthCookies) {
    await context.clearCookies();
  }

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${btoa(
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
