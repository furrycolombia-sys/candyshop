import { getCurrentUserId } from "api/supabase";
import { getSupabaseAccessToken } from "api/supabase/browser";

import {
  AUDIT_ACTION_TYPES,
  AUDIT_PAGE_SIZE,
} from "@/features/audit/domain/constants";
import type { AuditEntry, AuditFilters } from "@/features/audit/domain/types";
import type { SupabaseClient } from "@/shared/domain/types";
import {
  auditRestQuery,
  getSupabaseConfig,
} from "@/shared/infrastructure/auditRestClient";

/* PostgREST query parameter keys & values */
const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const PARAM_TABLE_NAME = "table_name";
const PARAM_ACTION_TYPE = "action_type";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const POSTGREST_EQ_PREFIX = "eq.";
const AUDIT_SCHEMA = "audit";
const JSON_CONTENT_TYPE = "application/json";

/** Fetch audit log entries with optional filters */
export async function fetchAuditLog(
  filters?: Partial<AuditFilters>,
  offset = 0,
): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("offset", String(offset));
  params.set("limit", String(AUDIT_PAGE_SIZE));

  if (filters?.tableName) {
    const safeName = filters.tableName.replaceAll(/\W/g, "");
    if (safeName) {
      params.set(PARAM_TABLE_NAME, POSTGREST_EQ_PREFIX + safeName);
    }
  }

  if (filters?.actionType) {
    const safeActionType = (AUDIT_ACTION_TYPES as readonly string[]).includes(
      filters.actionType,
    )
      ? filters.actionType
      : null;
    if (safeActionType) {
      params.set(PARAM_ACTION_TYPE, POSTGREST_EQ_PREFIX + safeActionType);
    }
  }

  const data = await auditRestQuery("logged_actions_with_user", params);
  return data as AuditEntry[];
}

/** Fetch distinct table names for the filter dropdown */
export async function fetchAuditTableNames(): Promise<string[]> {
  const params = new URLSearchParams();
  params.set(PARAM_SELECT, PARAM_TABLE_NAME);
  params.set(PARAM_ORDER, PARAM_TABLE_NAME);

  const data = await auditRestQuery("logged_actions_with_user", params);
  const names = (data as Array<{ table_name: string }>).map(
    (r) => r.table_name,
  );
  return [...new Set(names)];
}

/**
 * Log a custom manual action to the audit schema directly via POST.
 *
 * Still takes a Supabase client — unlike `auditRestQuery`, this needs the
 * caller's local `user_profiles.id` for the `user_id` column, which requires
 * the `current_user_id()` RPC (see `getCurrentUserId`), not just a bearer
 * token. `session?.user?.id` used to be that id directly off the Supabase
 * Auth session; there is no such session under Third-Party Auth.
 */
export async function insertAuditLog(
  supabase: SupabaseClient,
  actionType: string,
  tableName: string,
  rowData: unknown = null,
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Unauthenticated");

  const userId = await getCurrentUserId(supabase);

  const endpoint = `${url}/rest/v1/logged_actions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`, // eslint-disable-line i18next/no-literal-string -- HTTP header
      "Content-Profile": AUDIT_SCHEMA,
      "Content-Type": JSON_CONTENT_TYPE,
      Prefer: "return=minimal", // eslint-disable-line i18next/no-literal-string -- HTTP header
    },
    body: JSON.stringify({
      action_type: actionType,
      schema_name: "public",
      table_name: tableName,
      row_data: rowData,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Audit insert failed: ${String(response.status)}`);
  }
}
