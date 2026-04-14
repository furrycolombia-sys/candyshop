import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: (props: any) => <input {...props} />,
}));

import { DelegateOrderActions } from "./DelegateOrderActions";

describe("DelegateOrderActions", () => {
  it("renders approve button when canApprove is true", () => {
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove
        canRequestProof={false}
        onApprove={vi.fn()}
        onRequestProof={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("delegate-action-approve-order-1"),
    ).toBeInTheDocument();
  });

  it("renders request proof button when canRequestProof is true", () => {
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove={false}
        canRequestProof
        onApprove={vi.fn()}
        onRequestProof={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("delegate-action-request-proof-order-1"),
    ).toBeInTheDocument();
  });

  it("does not render approve button when canApprove is false", () => {
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove={false}
        canRequestProof
        onApprove={vi.fn()}
        onRequestProof={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("delegate-action-approve-order-1"),
    ).not.toBeInTheDocument();
  });

  it("shows confirmation panel when approve is clicked", () => {
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove
        canRequestProof={false}
        onApprove={vi.fn()}
        onRequestProof={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("delegate-action-approve-order-1"));
    expect(screen.getByTestId("delegate-confirm-checkbox")).toBeInTheDocument();
    expect(screen.getByTestId("delegate-confirm-submit")).toBeInTheDocument();
  });

  it("calls onApprove after confirmation", () => {
    const onApprove = vi.fn();
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove
        canRequestProof={false}
        onApprove={onApprove}
        onRequestProof={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("delegate-action-approve-order-1"));
    fireEvent.click(screen.getByTestId("delegate-confirm-checkbox"));
    fireEvent.click(screen.getByTestId("delegate-confirm-submit"));
    expect(onApprove).toHaveBeenCalledWith("order-1");
  });

  it("renders seller note input when canRequestProof", () => {
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove={false}
        canRequestProof
        onApprove={vi.fn()}
        onRequestProof={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("delegate-seller-note-input"),
    ).toBeInTheDocument();
  });

  it("does not call onApprove when confirm submit is clicked without checking checkbox", () => {
    const onApprove = vi.fn();
    render(
      <DelegateOrderActions
        orderId="order-1"
        canApprove
        canRequestProof={false}
        onApprove={onApprove}
        onRequestProof={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("delegate-action-approve-order-1"));
    fireEvent.click(screen.getByTestId("delegate-confirm-submit"));
    expect(onApprove).not.toHaveBeenCalled();
  });
});
