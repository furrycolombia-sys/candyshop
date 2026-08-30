import { getCurrentUserId } from "api/supabase";

import type { SupabaseClient } from "@/shared/domain/types";

export async function fetchPendingOrderCount(
  supabase: SupabaseClient,
): Promise<number> {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .in("payment_status", ["pending_verification", "evidence_requested"]);

  if (error) return 0;
  return count ?? 0;
}
