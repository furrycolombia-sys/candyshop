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

import { ReceiptUpload } from "@/features/checkout/presentation/components/ReceiptUpload";

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

  it("ignores unsupported receipt files", () => {
    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;
    const file = new File(["data"], "receipt.gif", { type: "image/gif" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileChange).not.toHaveBeenCalled();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("calls createObjectURL and onFileChange when a valid PNG is selected", () => {
    mockCreateObjectURL.mockReturnValue("blob:preview-url");

    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;
    const file = new File(["data"], "receipt.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(mockOnFileChange).toHaveBeenCalledWith(file);
  });

  it("shows preview image once file prop and internal preview are both set", () => {
    mockCreateObjectURL.mockReturnValue("blob:preview-url");

    const file = new File(["data"], "receipt.png", { type: "image/png" });
    const { rerender } = render(
      <ReceiptUpload file={null} onFileChange={mockOnFileChange} />,
    );

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Provide the file prop so the preview section renders
    rerender(<ReceiptUpload file={file} onFileChange={mockOnFileChange} />);

    expect(screen.getByTestId("receipt-preview")).toBeInTheDocument();
  });

  it("revokes previous preview URL when a new file is selected", () => {
    const file1 = new File(["d1"], "r1.png", { type: "image/png" });
    const file2 = new File(["d2"], "r2.png", { type: "image/png" });
    mockCreateObjectURL
      .mockReturnValueOnce("blob:url-1")
      .mockReturnValueOnce("blob:url-2");

    render(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file1] } });
    fireEvent.change(input, { target: { files: [file2] } });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-1");
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
  });

  it("revokes preview URL when remove is clicked after a file was selected", () => {
    mockCreateObjectURL.mockReturnValue("blob:to-revoke-on-remove");

    const file = new File(["data"], "receipt.png", { type: "image/png" });
    const { rerender } = render(
      <ReceiptUpload file={null} onFileChange={mockOnFileChange} />,
    );

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    rerender(<ReceiptUpload file={file} onFileChange={mockOnFileChange} />);

    fireEvent.click(screen.getByTestId("receipt-remove"));

    expect(mockRevokeObjectURL).toHaveBeenCalledWith(
      "blob:to-revoke-on-remove",
    );
  });

  it("revokes preview URL when file prop is cleared externally", async () => {
    mockCreateObjectURL.mockReturnValue("blob:external-clear");

    const file = new File(["data"], "receipt.png", { type: "image/png" });
    const { rerender } = render(
      <ReceiptUpload file={null} onFileChange={mockOnFileChange} />,
    );

    const input = screen.getByTestId("receipt-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Simulate parent updating the file prop after receiving onFileChange callback
    rerender(<ReceiptUpload file={file} onFileChange={mockOnFileChange} />);

    // Clear file prop externally — file changes null→file→null, triggering the cleanup effect
    rerender(<ReceiptUpload file={null} onFileChange={mockOnFileChange} />);

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:external-clear");
  });
});
