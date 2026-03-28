import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:preview-url");
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

import { ReceiptUpload } from "./ReceiptUpload";

describe("ReceiptUpload", () => {
  const mockOnFileChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload trigger when no file is selected", () => {
    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    expect(screen.getByTestId("receipt-upload-trigger")).toBeInTheDocument();
    // "uploadReceipt" appears as both label and button text
    expect(screen.getAllByText("uploadReceipt").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows file name and preview when file is selected", () => {
    const file = new File(["data"], "receipt.png", { type: "image/png" });

    render(<ReceiptUpload file={file} onFileChange={mockOnFileChange} />);

    expect(screen.getByText("receipt.png")).toBeInTheDocument();
    expect(screen.getByTestId("receipt-remove")).toBeInTheDocument();
  });

  it("calls onFileChange with null when remove is clicked", () => {
    const file = new File(["data"], "receipt.png", { type: "image/png" });

    render(<ReceiptUpload file={file} onFileChange={mockOnFileChange} />);

    fireEvent.click(screen.getByTestId("receipt-remove"));
    expect(mockOnFileChange).toHaveBeenCalledWith(null);
  });

  it("disables remove button when disabled", () => {
    const file = new File(["data"], "receipt.png", { type: "image/png" });

    render(
      <ReceiptUpload file={file} onFileChange={mockOnFileChange} disabled />,
    );

    expect(screen.getByTestId("receipt-remove")).toBeDisabled();
  });

  it("disables upload trigger when disabled", () => {
    render(
      <ReceiptUpload file={null} onFileChange={mockOnFileChange} disabled />,
    );

    expect(screen.getByTestId("receipt-upload-trigger")).toBeDisabled();
  });

  it("shows max file size hint", () => {
    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    expect(screen.getByText("maxFileSize")).toBeInTheDocument();
  });

  it("has the correct wrapper test ID", () => {
    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    expect(screen.getByTestId("receipt-upload")).toBeInTheDocument();
  });
});
