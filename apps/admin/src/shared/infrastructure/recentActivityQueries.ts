import type {
  RecentActivityEntry,
  SupabaseClient,
} from "@/shared/domain/types";
import { auditRestQuery } from "@/shared/infrastructure/auditRestClient";

const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const RECENT_ACTIVITY_LIMIT = 5;
const SELECT_RECENT_ACTIVITY =
  "event_id,table_name,user_email,user_display_name,db_user,action_type,action_timestamp";

export async function fetchRecentActivity(
  supabase: SupabaseClient,
): Promise<RecentActivityEntry[]> {
  const params = new URLSearchParams();
  params.set(PARAM_SELECT, SELECT_RECENT_ACTIVITY);
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("limit", String(RECENT_ACTIVITY_LIMIT));

  const data = await auditRestQuery(
    supabase,
    "logged_actions_with_user",
    params,
  );
  return data as RecentActivityEntry[];
}
