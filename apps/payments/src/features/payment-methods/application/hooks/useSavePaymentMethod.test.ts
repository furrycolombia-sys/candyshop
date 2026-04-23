import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useUpdatePaymentMethod: vi.fn(),
  }),
);

import { useSavePaymentMethod } from "./useSavePaymentMethod";

import { useUpdatePaymentMethod } from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import type { SellerPaymentMethod } from "@/features/payment-methods/domain/types";

const initialMethod: SellerPaymentMethod = {
  id: "pm-1",
  seller_id: "seller-1",
  name_en: "Nequi",
  name_es: "Nequi",
  display_blocks: [],
  form_fields: [],
  is_active: true,
  requires_receipt: false,
  requires_transfer_number: false,
  sort_order: 0,
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

const defaultParams = {
  paymentMethodId: "pm-1",
  initial: initialMethod,
  nameEn: "Nequi",
  nameEs: "Nequi",
  displayBlocks: [],
  formFields: [],
  requiresReceipt: false,
  requiresTransferNumber: false,
};

describe("useSavePaymentMethod", () => {
  const mutateMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mutateMock.mockReset();
    vi.mocked(useUpdatePaymentMethod).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePaymentMethod>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isDirty is false when state matches initial values", () => {
    const { result } = renderHook(() => useSavePaymentMethod(defaultParams));
    expect(result.current.isDirty).toBe(false);
  });

  it("isDirty is true when nameEn changes", () => {
    const { result } = renderHook(() =>
      useSavePaymentMethod({ ...defaultParams, nameEn: "Updated" }),
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("isDirty is true when requiresReceipt changes", () => {
    const { result } = renderHook(() =>
      useSavePaymentMethod({ ...defaultParams, requiresReceipt: true }),
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("isDirty is true when displayBlocks change", () => {
    const { result } = renderHook(() =>
      useSavePaymentMethod({
        ...defaultParams,
        displayBlocks: [{ id: "b1", type: "text", content_en: "hello" }],
      }),
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("save calls mutate with all current fields", () => {
    const { result } = renderHook(() =>
      useSavePaymentMethod({ ...defaultParams, nameEn: "New Name" }),
    );

    act(() => {
      result.current.save();
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        id: "pm-1",
        patch: {
          name_en: "New Name",
          name_es: "Nequi",
          display_blocks: [],
          form_fields: [],
          requires_receipt: false,
          requires_transfer_number: false,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("omits name_es from patch when empty string", () => {
    const { result } = renderHook(() =>
      useSavePaymentMethod({ ...defaultParams, nameEn: "Changed", nameEs: "" }),
    );

    act(() => {
      result.current.save();
    });

    const patch = mutateMock.mock.calls[0][0].patch;
    expect(patch.name_es).toBeUndefined();
  });

  it("savedRecently is false initially", () => {
    const { result } = renderHook(() => useSavePaymentMethod(defaultParams));
    expect(result.current.savedRecently).toBe(false);
  });

  it("savedRecently becomes true on success and resets after 2 seconds", () => {
    mutateMock.mockImplementation((_args, callbacks) => {
      callbacks.onSuccess();
    });

    const { result } = renderHook(() =>
      useSavePaymentMethod({ ...defaultParams, nameEn: "Changed" }),
    );

    act(() => {
      result.current.save();
    });

    expect(result.current.savedRecently).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.savedRecently).toBe(false);
  });
});
