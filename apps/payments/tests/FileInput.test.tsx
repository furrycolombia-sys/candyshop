import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock("@/shared/domain/paymentMethodUtils", () => ({
  validateFileSize: vi.fn(() => true),
}));

import { FileInput } from "@/features/checkout/presentation/components/FileInput";

import { validateFileSize } from "@/shared/domain/paymentMethodUtils";

function getFileInput() {
  return screen.getByTestId("file-1") as HTMLInputElement;
}

describe("FileInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateFileSize).mockReturnValue(true);
  });

  it("renders a file input element", () => {
    render(<FileInput id="file-1" disabled={false} onChange={vi.fn()} />);
    expect(getFileInput()).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<FileInput id="file-1" disabled={true} onChange={vi.fn()} />);
    expect(getFileInput()).toBeDisabled();
  });

  it("calls onFileChange(null) and onChange('') when no file is selected", () => {
    const onFileChange = vi.fn();
    const onChange = vi.fn();
    const onFileSizeError = vi.fn();

    render(
      <FileInput
        id="file-1"
        disabled={false}
        onFileChange={onFileChange}
        onChange={onChange}
        onFileSizeError={onFileSizeError}
      />,
    );

    fireEvent.change(getFileInput(), { target: { files: [] } });

    expect(onFileChange).toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenCalledWith("");
    expect(onFileSizeError).toHaveBeenCalledWith(null);
  });

  it("reports size error and clears handlers when file exceeds limit", () => {
    vi.mocked(validateFileSize).mockReturnValue(false);

    const onFileChange = vi.fn();
    const onChange = vi.fn();
    const onFileSizeError = vi.fn();

    render(
      <FileInput
        id="file-1"
        disabled={false}
        onFileChange={onFileChange}
        onChange={onChange}
        onFileSizeError={onFileSizeError}
      />,
    );

    const file = new File(["x"], "big.pdf", { type: "application/pdf" });
    fireEvent.change(getFileInput(), { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenCalledWith("");
    expect(onFileSizeError).toHaveBeenCalledWith(
      expect.stringContaining("fileSizeExceeded"),
    );
  });

  it("passes file to handlers when file is within size limit", () => {
    vi.mocked(validateFileSize).mockReturnValue(true);

    const onFileChange = vi.fn();
    const onChange = vi.fn();
    const onFileSizeError = vi.fn();

    render(
      <FileInput
        id="file-1"
        disabled={false}
        onFileChange={onFileChange}
        onChange={onChange}
        onFileSizeError={onFileSizeError}
      />,
    );

    const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(getFileInput(), { target: { files: [file] } });

    expect(onFileSizeError).toHaveBeenCalledWith(null);
    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith("receipt.jpg");
  });
});
