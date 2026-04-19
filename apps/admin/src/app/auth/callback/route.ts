import { handleOAuthCallback } from "api/supabase/callback";

/**
 * OAuth callback - exchanges the authorization code for a session.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: Request) {
  return handleOAuthCallback(
    request as Parameters<typeof handleOAuthCallback>[0],
  );
}
