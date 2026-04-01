/* eslint-disable i18next/no-literal-string -- infrastructure file: audit schema identifiers and REST headers are not user-facing copy */
import type { createBrowserSupabaseClient } from "api/supabase";

import type { RecentActivityEntry } from "@/shared/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const RECENT_ACTIVITY_LIMIT = 5;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key };
}

async function auditQuery(
  supabase: SupabaseClient,
  table: string,
  params: URLSearchParams,
): Promise<unknown[]> {
  const { url, key } = getSupabaseConfig();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? key;
  const endpoint = `${url}/rest/v1/${table}?${params.toString()}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Accept-Profile": "audit",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Recent activity query failed: ${String(response.status)}`);
  }

  return response.json() as Promise<unknown[]>;
}

export async function fetchRecentActivity(
  supabase: SupabaseClient,
): Promise<RecentActivityEntry[]> {
  const params = new URLSearchParams();
  params.set(
    PARAM_SELECT,
    "event_id,table_name,user_email,user_display_name,db_user,action_type,action_timestamp",
  );
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("limit", String(RECENT_ACTIVITY_LIMIT));

  const data = await auditQuery(supabase, "logged_actions_with_user", params);
  return data as RecentActivityEntry[];
}
