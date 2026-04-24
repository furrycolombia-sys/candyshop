import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

/**
 * Encode a string as base64url (URL-safe base64, no padding).
 * @supabase/ssr uses base64url encoding for cookie values — standard btoa()
 * produces base64 with +/= chars that @supabase/ssr's stringFromBase64URL
 * will reject as invalid characters.
 */
function toBase64URL(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const SESSION_EXPIRY_SECONDS = 3600;

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

const AUTH_FILE = "e2e/.auth/session.json";
const { store: STORE_URL } = resolveE2EAppUrls();
const storeHost = new URL(STORE_URL);
const isLocalhost =
  storeHost.hostname === "localhost" || storeHost.hostname === "127.0.0.1";

setup("authenticate", async ({ context, page }) => {
  if (SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error(
      "[auth.setup] SUPABASE_SERVICE_ROLE_KEY is not configured. Start Supabase with `pnpm supabase start`.",
    );
  }

  // Must match SUPABASE_COOKIE_KEY in packages/api/src/supabase/config.ts
  // which uses deriveProjectRef: 127.0.0.1 → "127.0.0.1", localhost → "localhost"
  const refHostname = new URL(SUPABASE_URL).hostname;
  const projectRef =
    refHostname === "localhost" || refHostname === "127.0.0.1"
      ? refHostname
      : refHostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = `e2e-${Date.now()}@test.invalid`;
  const password = `test-${Date.now()}`;

  const { data: user, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError)
    throw new Error(`Failed to create test user: ${createError.message}`);

  const { data: session, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (signInError)
    throw new Error(`Failed to sign in test user: ${signInError.message}`);

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${toBase64URL(
        JSON.stringify({
          access_token: session.session!.access_token,
          refresh_token: session.session!.refresh_token,
          token_type: "bearer",
          expires_in: SESSION_EXPIRY_SECONDS,
          expires_at: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
          user: user.user,
        }),
      )}`,
      domain: storeHost.hostname,
      path: "/",
      httpOnly: false,
      secure: !isLocalhost,
      sameSite: "Lax",
    },
  ]);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.goto(`${STORE_URL}/en`);
  await context.storageState({ path: AUTH_FILE });

  // NOTE: Do NOT delete the test user here.
  // The Supabase browser client calls getUser() (a real network request) to
  // validate the session on every page load. If the user is deleted before
  // tests run, getUser() fails → session is cleared → ProtectedRoute redirects
  // to login, breaking all authenticated tests.
  // The user is safe to leave: in CI, the Docker Supabase instance is destroyed
  // after the job. Locally, run `pnpm supabase:reset` to clean up.
});
