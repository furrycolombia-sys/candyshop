import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { ResubmitEvidenceForm } from "./ResubmitEvidenceForm";

describe("ResubmitEvidenceForm", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with transfer number input", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    expect(screen.getByText("transferNumber")).toBeInTheDocument();
    expect(screen.getByTestId("resubmit-transfer-order-1")).toBeInTheDocument();
  });

  it("shows the seller note when provided", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote="Please provide a clearer receipt"
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    expect(
      screen.getByText("Please provide a clearer receipt"),
    ).toBeInTheDocument();
    expect(screen.getByText("sellerNote")).toBeInTheDocument();
  });

  it("does not show seller note section when null", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    expect(screen.queryByText("sellerNote")).not.toBeInTheDocument();
  });

  it("does not submit when transfer number is empty", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("resubmit-submit-order-1"));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits when transfer number is filled", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    const input = screen.getByTestId("resubmit-transfer-order-1");
    fireEvent.change(input, { target: { value: "TX-123" } });
    fireEvent.click(screen.getByTestId("resubmit-submit-order-1"));

    expect(mockOnSubmit).toHaveBeenCalledWith("TX-123", null);
  });

  it("shows submitting text when isPending", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={true}
      />,
    );

    expect(screen.getByText("submitting")).toBeInTheDocument();
  });

  it("shows submit text when not pending", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    expect(screen.getByText("submit")).toBeInTheDocument();
  });

  it("disables submit button when isPending", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={true}
      />,
    );

    const submitBtn = screen.getByTestId("resubmit-submit-order-1");
    expect(submitBtn).toBeDisabled();
  });
});
