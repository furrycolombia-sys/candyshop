import { handleOAuthCallback } from "api/supabase/callback";
import type { NextRequest } from "next/server";

/**
 * OAuth callback - exchanges the authorization code for a session.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}
