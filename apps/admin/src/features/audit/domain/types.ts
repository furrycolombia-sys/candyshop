/** A row from audit.logged_actions_with_user (view with profile data) */
export interface AuditEntry {
  event_id: number;
  schema_name: string;
  table_name: string;
  user_id: string | null;
  user_email: string | null;
  user_display_name: string | null;
  user_avatar: string | null;
  db_user: string;
  action_type: "INSERT" | "UPDATE" | "DELETE";
  row_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown> | null;
  action_timestamp: string;
  transaction_id: number;
  client_ip: string | null;
}

export interface AuditFilters {
  tableName: string;
  actionType: string;
}
