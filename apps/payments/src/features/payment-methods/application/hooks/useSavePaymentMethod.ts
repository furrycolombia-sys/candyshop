import { useState } from "react";

import { useUpdatePaymentMethod } from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import type {
  DisplayBlock,
  FormField,
  SellerPaymentMethod,
} from "@/features/payment-methods/domain/types";

interface UseSavePaymentMethodParams {
  paymentMethodId: string;
  initial: SellerPaymentMethod;
  nameEn: string;
  nameEs: string;
  displayBlocks: DisplayBlock[];
  formFields: FormField[];
  requiresReceipt: boolean;
  requiresTransferNumber: boolean;
}

export function useSavePaymentMethod({
  paymentMethodId,
  initial,
  nameEn,
  nameEs,
  displayBlocks,
  formFields,
  requiresReceipt,
  requiresTransferNumber,
}: UseSavePaymentMethodParams) {
  const updateMutation = useUpdatePaymentMethod();
  const [savedRecently, setSavedRecently] = useState(false);

  const nameChanged =
    nameEn !== initial.name_en || nameEs !== (initial.name_es ?? "");
  const blocksChanged =
    JSON.stringify(displayBlocks) !==
    JSON.stringify(initial.display_blocks ?? []);
  const fieldsChanged =
    JSON.stringify(formFields) !== JSON.stringify(initial.form_fields ?? []);
  const settingsChanged =
    requiresReceipt !== initial.requires_receipt ||
    requiresTransferNumber !== initial.requires_transfer_number;
  const isDirty =
    nameChanged || blocksChanged || fieldsChanged || settingsChanged;

  const SAVED_RECENTLY_RESET_MS = 2000;

  const save = () => {
    updateMutation.mutate(
      {
        id: paymentMethodId,
        patch: {
          name_en: nameEn,
          name_es: nameEs || undefined,
          display_blocks: displayBlocks,
          form_fields: formFields,
          requires_receipt: requiresReceipt,
          requires_transfer_number: requiresTransferNumber,
        },
      },
      {
        onSuccess: () => {
          setSavedRecently(true);
          setTimeout(() => setSavedRecently(false), SAVED_RECENTLY_RESET_MS);
        },
      },
    );
  };

  return {
    isDirty,
    isPending: updateMutation.isPending,
    savedRecently,
    save,
  };
}
