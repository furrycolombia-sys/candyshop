import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useUpdatePaymentMethod: vi.fn(),
  }),
);

import { useAutoSavePaymentMethod } from "./useAutoSavePaymentMethod";

import { useUpdatePaymentMethod } from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";

const defaultParams = {
  paymentMethodId: "pm-1",
  nameEn: "Nequi",
  nameEs: "Nequi",
  displayBlocks: [],
  formFields: [],
};

describe("useAutoSavePaymentMethod", () => {
  const mutateMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mutateMock.mockReset();
    vi.mocked(useUpdatePaymentMethod).mockReturnValue({
      mutate: mutateMock,
    } as unknown as ReturnType<typeof useUpdatePaymentMethod>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns idle saveStatus on mount", () => {
    const { result } = renderHook(() =>
      useAutoSavePaymentMethod(defaultParams),
    );
    expect(result.current.saveStatus).toBe("idle");
  });

  it("debounces save and sets saving status immediately", () => {
    const { result, rerender } = renderHook(
      (props) => useAutoSavePaymentMethod(props),
      { initialProps: defaultParams },
    );

    rerender({ ...defaultParams, nameEn: "Updated Name" });

    expect(result.current.saveStatus).toBe("saving");
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("calls mutate after debounce delay", () => {
    const { rerender } = renderHook(
      (props) => useAutoSavePaymentMethod(props),
      { initialProps: defaultParams },
    );

    rerender({ ...defaultParams, nameEn: "New Name" });

    act(() => {
      vi.runAllTimers();
    });

    expect(mutateMock).toHaveBeenCalledWith(
      { id: "pm-1", patch: { name_en: "New Name", name_es: "Nequi" } },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("sets saveStatus to saved on success callback", () => {
    const { result, rerender } = renderHook(
      (props) => useAutoSavePaymentMethod(props),
      { initialProps: defaultParams },
    );

    rerender({ ...defaultParams, nameEn: "New Name" });

    mutateMock.mockImplementation((_args, callbacks) => {
      callbacks.onSuccess();
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("resets saveStatus to idle on error callback", () => {
    const { result, rerender } = renderHook(
      (props) => useAutoSavePaymentMethod(props),
      { initialProps: defaultParams },
    );

    rerender({ ...defaultParams, nameEn: "New Name" });

    mutateMock.mockImplementation((_args, callbacks) => {
      callbacks.onError();
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.saveStatus).toBe("idle");
  });

  it("skips save when nameEn is empty", () => {
    renderHook(() =>
      useAutoSavePaymentMethod({ ...defaultParams, nameEn: "" }),
    );

    act(() => {
      vi.runAllTimers();
    });

    // Only display_blocks and form_fields triggers fire, not nameEn
    const nameEnCalls = mutateMock.mock.calls.filter((c) =>
      Object.prototype.hasOwnProperty.call(c[0]?.patch ?? {}, "name_en"),
    );
    expect(nameEnCalls).toHaveLength(0);
  });

  it("clears debounce timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount, rerender } = renderHook(
      (props) => useAutoSavePaymentMethod(props),
      { initialProps: defaultParams },
    );

    rerender({ ...defaultParams, nameEn: "Pending" });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
