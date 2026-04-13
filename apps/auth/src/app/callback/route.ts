import { handleOAuthCallback } from "api/supabase/callback";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}
