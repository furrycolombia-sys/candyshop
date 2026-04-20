import type { ReceiptBackup } from "@/features/users/application/utils/exportCsv";
import { fetchUserReceipts } from "@/features/users/infrastructure/userReceiptQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserReceiptsBatch() {
  const supabase = useSupabase();

  const fetchReceipts = (userIds: string[]): Promise<ReceiptBackup[]> =>
    fetchUserReceipts(supabase, userIds);

  return { fetchReceipts };
}
