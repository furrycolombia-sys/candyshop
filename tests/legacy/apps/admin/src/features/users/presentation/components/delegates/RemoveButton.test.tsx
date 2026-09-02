import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

const mockMutate = vi.fn();
const mockIsPending = { value: false };

vi.mock("@/features/users/application/hooks/useUserDelegates", () => ({
  useRemoveUserDelegate: () => ({
    mutate: mockMutate,
    isPending: mockIsPending.value,
  }),
}));

import { RemoveButton } from "./RemoveButton";

describe("RemoveButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
  });

  it("renders nothing when canDelete is false", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={false} />);
    expect(screen.queryByTestId("remove-delegate-r1")).not.toBeInTheDocument();
  });

  it("renders the trash button when canDelete is true", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={true} />);
    expect(screen.getByTestId("remove-delegate-r1")).toBeInTheDocument();
  });

  it("shows confirm/cancel buttons after clicking trash", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={true} />);
    fireEvent.click(screen.getByTestId("remove-delegate-r1"));
    expect(
      screen.getByTestId("confirm-remove-delegate-r1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cancel-remove-delegate-r1")).toBeInTheDocument();
  });

  it("cancel returns to initial state", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={true} />);
    fireEvent.click(screen.getByTestId("remove-delegate-r1"));
    fireEvent.click(screen.getByTestId("cancel-remove-delegate-r1"));
    expect(screen.getByTestId("remove-delegate-r1")).toBeInTheDocument();
    expect(
      screen.queryByTestId("confirm-remove-delegate-r1"),
    ).not.toBeInTheDocument();
  });

  it("calls mutate with userId and rowId when confirmed", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={true} />);
    fireEvent.click(screen.getByTestId("remove-delegate-r1"));
    fireEvent.click(screen.getByTestId("confirm-remove-delegate-r1"));
    expect(mockMutate).toHaveBeenCalledWith(
      { userId: "u1", delegateRowId: "r1" },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("mutate receives onSettled callback that can be invoked", () => {
    render(<RemoveButton rowId="r1" userId="u1" canDelete={true} />);
    fireEvent.click(screen.getByTestId("remove-delegate-r1"));
    fireEvent.click(screen.getByTestId("confirm-remove-delegate-r1"));
    const { onSettled } = mockMutate.mock.calls[0]![1] as {
      onSettled: () => void;
    };
    expect(typeof onSettled).toBe("function");
  });
});
