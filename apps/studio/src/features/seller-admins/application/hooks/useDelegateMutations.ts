import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { SELLER_ADMINS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import type { DelegatePermission } from "@/features/seller-admins/domain/types";
import {
  addDelegate,
  updateDelegatePermissions,
  removeDelegate,
} from "@/features/seller-admins/infrastructure/delegateMutations";

export function useAddDelegate() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      sellerId,
      adminUserId,
      permissions,
    }: {
      sellerId: string;
      adminUserId: string;
      permissions: DelegatePermission[];
    }) => addDelegate(supabase, sellerId, adminUserId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SELLER_ADMINS_QUERY_KEY] });
    },
  });
}

export function useUpdateDelegatePermissions() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      sellerId,
      adminUserId,
      permissions,
    }: {
      sellerId: string;
      adminUserId: string;
      permissions: DelegatePermission[];
    }) =>
      updateDelegatePermissions(supabase, sellerId, adminUserId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SELLER_ADMINS_QUERY_KEY] });
    },
  });
}

export function useRemoveDelegate() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      sellerId,
      adminUserId,
    }: {
      sellerId: string;
      adminUserId: string;
    }) => removeDelegate(supabase, sellerId, adminUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SELLER_ADMINS_QUERY_KEY] });
    },
  });
}
