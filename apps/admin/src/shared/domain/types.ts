export interface RecentActivityEntry {
  event_id: number;
  table_name: string;
  user_email: string | null;
  user_display_name: string | null;
  db_user: string;
  action_type: "INSERT" | "UPDATE" | "DELETE";
  action_timestamp: string;
}
