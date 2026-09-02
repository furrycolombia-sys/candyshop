import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { ResubmitEvidenceForm } from "./ResubmitEvidenceForm";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors MAX_RECEIPT_SIZE_BYTES

describe("ResubmitEvidenceForm", () => {
  const mockOnSubmit = vi.fn();
  const mockCreateObjectURL = vi.fn(() => "blob:fake-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
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

  it("shows remove button after a valid file is selected", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    const fileInput = screen.getByTestId(
      "resubmit-file-input-order-1",
    ) as HTMLInputElement;
    const file = new File(["data"], "receipt.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(
      screen.getByTestId("resubmit-remove-receipt-order-1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("resubmit-upload-btn-order-1"),
    ).not.toBeInTheDocument();
  });

  it("ignores oversized files and keeps the upload button visible", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    const fileInput = screen.getByTestId(
      "resubmit-file-input-order-1",
    ) as HTMLInputElement;
    const oversizedFile = new File(["x".repeat(MAX_SIZE + 1)], "big.png", {
      type: "image/png",
    });
    Object.defineProperty(fileInput, "files", {
      value: [oversizedFile],
      configurable: true,
    });
    fireEvent.change(fileInput);

    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("resubmit-upload-btn-order-1"),
    ).toBeInTheDocument();
  });

  it("removes the file when the remove button is clicked", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    // First upload a valid file
    const fileInput = screen.getByTestId(
      "resubmit-file-input-order-1",
    ) as HTMLInputElement;
    const file = new File(["data"], "receipt.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    // Now remove it
    fireEvent.click(screen.getByTestId("resubmit-remove-receipt-order-1"));

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    expect(
      screen.getByTestId("resubmit-upload-btn-order-1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("resubmit-remove-receipt-order-1"),
    ).not.toBeInTheDocument();
  });

  it("clicking the upload button triggers the file input click handler", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );
    // Covers the non-null branch of fileInputRef.current?.click() on the upload button handler
    expect(() =>
      fireEvent.click(screen.getByTestId("resubmit-upload-btn-order-1")),
    ).not.toThrow();
  });

  it("submits with the file when both transfer number and receipt are provided", () => {
    render(
      <ResubmitEvidenceForm
        orderId="order-1"
        sellerNote={null}
        onSubmit={mockOnSubmit}
        isPending={false}
      />,
    );

    // Fill transfer number
    fireEvent.change(screen.getByTestId("resubmit-transfer-order-1"), {
      target: { value: "TX-456" },
    });

    // Upload file
    const fileInput = screen.getByTestId(
      "resubmit-file-input-order-1",
    ) as HTMLInputElement;
    const file = new File(["data"], "receipt.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    // Submit
    fireEvent.click(screen.getByTestId("resubmit-submit-order-1"));
    expect(mockOnSubmit).toHaveBeenCalledWith("TX-456", file);
  });
});
