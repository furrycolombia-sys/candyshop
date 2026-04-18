import { useCallback, useEffect, useRef, useState } from "react";

import { useUpdatePaymentMethod } from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import type {
  DisplayBlock,
  FormField,
} from "@/features/payment-methods/domain/types";

const DEBOUNCE_MS = 500;

interface UseAutoSavePaymentMethodParams {
  paymentMethodId: string;
  nameEn: string;
  nameEs: string;
  displayBlocks: DisplayBlock[];
  formFields: FormField[];
}

type SaveStatus = "idle" | "saving" | "saved";

/**
 * Manages debounced auto-save logic for a payment method.
 *
 * Responsible for coordinating all persistence side-effects so that
 * PaymentMethodEditor can focus on local UI state only.
 */
export function useAutoSavePaymentMethod({
  paymentMethodId,
  nameEn,
  nameEs,
  displayBlocks,
  formFields,
}: UseAutoSavePaymentMethodParams): { saveStatus: SaveStatus } {
  const updateMutation = useUpdatePaymentMethod();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentMethodIdRef = useRef(paymentMethodId);
  paymentMethodIdRef.current = paymentMethodId;
  // Store mutation in a ref so triggerSave has a stable identity and doesn't
  // cause the three dependent useEffects to re-run on each TanStack Query re-render.
  const mutationRef = useRef(updateMutation);
  mutationRef.current = updateMutation;

  const triggerSave = useCallback(
    (patch: Parameters<typeof updateMutation.mutate>[0]["patch"]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("saving");
      debounceRef.current = setTimeout(() => {
        mutationRef.current.mutate(
          { id: paymentMethodIdRef.current, patch },
          {
            onSuccess: () => setSaveStatus("saved"),
            onError: () => setSaveStatus("idle"),
          },
        );
      }, DEBOUNCE_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: uses mutationRef.current (ref pattern) for stable callback identity; updateMutation is not a dependency
    [],
  );

  // Per-effect first-render guards to avoid unnecessary PATCH requests on mount
  const nameFirstRenderRef = useRef(true);
  const blocksFirstRenderRef = useRef(true);
  const fieldsFirstRenderRef = useRef(true);

  // Auto-save name changes (validation is handled by the caller)
  useEffect(() => {
    if (nameFirstRenderRef.current) {
      nameFirstRenderRef.current = false;
      return;
    }
    if (!nameEn.trim()) return;
    triggerSave({ name_en: nameEn, name_es: nameEs || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on name changes
  }, [nameEn, nameEs]);

  // Auto-save display blocks
  useEffect(() => {
    if (blocksFirstRenderRef.current) {
      blocksFirstRenderRef.current = false;
      return;
    }
    triggerSave({ display_blocks: displayBlocks });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on block changes
  }, [displayBlocks]);

  // Auto-save form fields
  useEffect(() => {
    if (fieldsFirstRenderRef.current) {
      fieldsFirstRenderRef.current = false;
      return;
    }
    triggerSave({ form_fields: formFields });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on field changes
  }, [formFields]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { saveStatus };
}
