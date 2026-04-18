import type { SupabaseClient } from "@/shared/domain/types";

export async function fetchPendingOrderCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .in("payment_status", ["pending_verification", "evidence_requested"]);

  if (error) return 0;
  return count ?? 0;
}
