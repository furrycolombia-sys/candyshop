"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useUpdatePaymentMethod,
} from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import { usePaymentMethods } from "@/features/payment-methods/application/hooks/usePaymentMethods";

/** Encapsulates all data-fetching, mutations, and UI state for the payment methods page. */
export function usePaymentMethodsManager(sellerId: string) {
  const t = useTranslations("paymentMethods");

  const { data: methods, isLoading } = usePaymentMethods(sellerId);

  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCreate = useCallback(() => {
    createMutation.mutate(
      { sellerId, nameEn: "" },
      {
        onSuccess: (method) => {
          setExpandedId(method.id);
        },
      },
    );
  }, [createMutation, sellerId]);

  const handleDelete = useCallback(
    (id: string) => {
      if (globalThis.confirm(t("deleteConfirm"))) {
        if (expandedId === id) setExpandedId(null);
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation, expandedId, t],
  );

  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      updateMutation.mutate({ id, patch: { is_active: isActive } });
    },
    [updateMutation],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (!methods || index === 0) return;
      const current = methods[index];
      const prev = methods[index - 1];
      updateMutation.mutate({
        id: current.id,
        patch: { sort_order: prev.sort_order },
      });
      updateMutation.mutate({
        id: prev.id,
        patch: { sort_order: current.sort_order },
      });
    },
    [methods, updateMutation],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (!methods || index === methods.length - 1) return;
      const current = methods[index];
      const next = methods[index + 1];
      updateMutation.mutate({
        id: current.id,
        patch: { sort_order: next.sort_order },
      });
      updateMutation.mutate({
        id: next.id,
        patch: { sort_order: current.sort_order },
      });
    },
    [methods, updateMutation],
  );

  return {
    methods,
    isLoading,
    expandedId,
    isCreating: createMutation.isPending,
    handleToggleExpand,
    handleCreate,
    handleDelete,
    handleToggleActive,
    handleMoveUp,
    handleMoveDown,
  };
}
