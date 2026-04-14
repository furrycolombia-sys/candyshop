import type { createBrowserSupabaseClient } from "api/supabase";

import { AUDIT_PAGE_SIZE } from "@/features/audit/domain/constants";
import type { AuditEntry, AuditFilters } from "@/features/audit/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

/* PostgREST query parameter keys & values */
const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const PARAM_TABLE_NAME = "table_name";
const PARAM_ACTION_TYPE = "action_type";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const POSTGREST_EQ_PREFIX = "eq.";
const AUDIT_SCHEMA = "audit";
const JSON_CONTENT_TYPE = "application/json";

/** Get the Supabase REST URL and key from environment */
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key };
}

/** Direct REST query to the audit schema using the user's session token */
async function auditQuery(
  supabase: SupabaseClient,
  table: string,
  params: URLSearchParams,
): Promise<unknown[]> {
  const { url, key } = getSupabaseConfig();

  // Use the authenticated user's JWT so PostgREST applies the `authenticated` role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? key;

  const queryString = params.toString();
  const endpoint = `${url}/rest/v1/${table}?${queryString}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`, // eslint-disable-line i18next/no-literal-string -- HTTP header
      // Tell PostgREST to use the audit schema
      "Accept-Profile": AUDIT_SCHEMA,
      Accept: JSON_CONTENT_TYPE,
    },
  });

  if (!response.ok) {
    throw new Error(`Audit query failed: ${String(response.status)}`);
  }

  return response.json() as Promise<unknown[]>;
}

/** Fetch audit log entries with optional filters */
export async function fetchAuditLog(
  supabase: SupabaseClient,
  filters?: Partial<AuditFilters>,
  offset = 0,
): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("offset", String(offset));
  params.set("limit", String(AUDIT_PAGE_SIZE));

  if (filters?.tableName) {
    params.set(PARAM_TABLE_NAME, POSTGREST_EQ_PREFIX + filters.tableName);
  }

  if (filters?.actionType) {
    params.set(PARAM_ACTION_TYPE, POSTGREST_EQ_PREFIX + filters.actionType);
  }

  const data = await auditQuery(supabase, "logged_actions_with_user", params);
  return data as AuditEntry[];
}

/** Fetch distinct table names for the filter dropdown */
export async function fetchAuditTableNames(
  supabase: SupabaseClient,
): Promise<string[]> {
  const params = new URLSearchParams();
  params.set(PARAM_SELECT, PARAM_TABLE_NAME);
  params.set(PARAM_ORDER, PARAM_TABLE_NAME);

  const data = await auditQuery(supabase, "logged_actions_with_user", params);
  const names = (data as Array<{ table_name: string }>).map(
    (r) => r.table_name,
  );
  return [...new Set(names)];
}

/** Log a custom manual action to the audit schema directly via POST */
export async function insertAuditLog(
  supabase: SupabaseClient,
  actionType: string,
  tableName: string,
  rowData: unknown = null,
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? key;

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
      user_id: session?.user?.id ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Audit insert failed: ${String(response.status)}`);
  }
}
