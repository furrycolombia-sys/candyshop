import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../scripts/load-root-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getLocalSupabaseEnv } = require(
  path.resolve(__dirname, "../../../scripts/local-supabase-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);
loadRootEnv();

const localSupabaseEnv = getLocalSupabaseEnv();
const SUPABASE_URL =
  localSupabaseEnv.API_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  localSupabaseEnv.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const AUTH_FILE = "e2e/.auth/session.json";
const { store: STORE_URL } = resolveE2EAppUrls();
const storeHost = new URL(STORE_URL);
const isLocalhost =
  storeHost.hostname === "localhost" || storeHost.hostname === "127.0.0.1";

setup("authenticate", async ({ context, page }) => {
  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error(
      "[auth.setup] SUPABASE_SERVICE_ROLE_KEY is not configured. Start Supabase with `pnpm supabase start`.",
    );
  }

  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
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
      value: `base64-${btoa(
        JSON.stringify({
          access_token: session.session!.access_token,
          refresh_token: session.session!.refresh_token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
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

  // Cleanup: delete the test user after saving session
  await supabaseAdmin.auth.admin.deleteUser(user.user!.id).catch(() => {});
});
