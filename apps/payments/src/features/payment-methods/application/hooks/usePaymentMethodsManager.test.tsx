import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { usePaymentMethodsManager } from "./usePaymentMethodsManager";

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

const mockMethods = [
  {
    id: "pm-1",
    sort_order: 0,
    is_active: true,
    name_en: "Method 1",
    name_es: "Método 1",
  },
  {
    id: "pm-2",
    sort_order: 1,
    is_active: false,
    name_en: "Method 2",
    name_es: "Método 2",
  },
  {
    id: "pm-3",
    sort_order: 2,
    is_active: true,
    name_en: "Method 3",
    name_es: "Método 3",
  },
];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useCreatePaymentMethod: () => ({
      mutate: mockCreateMutate,
      isPending: false,
    }),
    useUpdatePaymentMethod: () => ({
      mutate: mockUpdateMutate,
    }),
    useDeletePaymentMethod: () => ({
      mutate: mockDeleteMutate,
    }),
  }),
);

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethods",
  () => ({
    usePaymentMethods: () => ({
      data: mockMethods,
      isLoading: false,
    }),
  }),
);

const SELLER_ID = "seller-123";

describe("usePaymentMethodsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns methods and loading state from usePaymentMethods", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));
    expect(result.current.methods).toBe(mockMethods);
    expect(result.current.isLoading).toBe(false);
  });

  it("starts with no expanded method", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));
    expect(result.current.expandedId).toBeNull();
  });

  it("toggles expanded method on handleToggleExpand", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleToggleExpand("pm-1");
    });
    expect(result.current.expandedId).toBe("pm-1");

    act(() => {
      result.current.handleToggleExpand("pm-1");
    });
    expect(result.current.expandedId).toBeNull();
  });

  it("collapses a different method when another is expanded", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleToggleExpand("pm-1");
    });
    act(() => {
      result.current.handleToggleExpand("pm-2");
    });
    expect(result.current.expandedId).toBe("pm-2");
  });

  it("handleCreate calls createMutation with sellerId", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleCreate();
    });

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { sellerId: SELLER_ID, nameEn: "" },
      expect.any(Object),
    );
  });

  it("handleCreate expands the new method on success", () => {
    mockCreateMutate.mockImplementationOnce(
      (
        _args: unknown,
        { onSuccess }: { onSuccess: (m: { id: string }) => void },
      ) => {
        onSuccess({ id: "pm-new" });
      },
    );
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleCreate();
    });

    expect(result.current.expandedId).toBe("pm-new");
  });

  it("handleDelete calls deleteMutation when confirmed", () => {
    const { result } = renderHook(() =>
      usePaymentMethodsManager(SELLER_ID, { onConfirm: () => true }),
    );

    act(() => {
      result.current.handleDelete("pm-1");
    });

    expect(mockDeleteMutate).toHaveBeenCalledWith("pm-1");
  });

  it("handleDelete does not call deleteMutation when cancelled", () => {
    const { result } = renderHook(() =>
      usePaymentMethodsManager(SELLER_ID, { onConfirm: () => false }),
    );

    act(() => {
      result.current.handleDelete("pm-1");
    });

    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("handleDelete collapses the deleted method if it was expanded", () => {
    const { result } = renderHook(() =>
      usePaymentMethodsManager(SELLER_ID, { onConfirm: () => true }),
    );

    act(() => {
      result.current.handleToggleExpand("pm-1");
    });
    act(() => {
      result.current.handleDelete("pm-1");
    });

    expect(result.current.expandedId).toBeNull();
  });

  it("handleToggleActive calls updateMutation with is_active patch", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleToggleActive("pm-2", true);
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: "pm-2",
      patch: { is_active: true },
    });
  });

  it("handleMoveUp swaps sort_order with the previous method", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleMoveUp(1);
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: "pm-2",
      patch: { sort_order: 0 },
    });
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: "pm-1",
      patch: { sort_order: 1 },
    });
  });

  it("handleMoveUp does nothing when already at the top", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleMoveUp(0);
    });

    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("handleMoveDown swaps sort_order with the next method", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleMoveDown(1);
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: "pm-2",
      patch: { sort_order: 2 },
    });
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: "pm-3",
      patch: { sort_order: 1 },
    });
  });

  it("handleMoveDown does nothing when already at the bottom", () => {
    const { result } = renderHook(() => usePaymentMethodsManager(SELLER_ID));

    act(() => {
      result.current.handleMoveDown(2);
    });

    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });
});
