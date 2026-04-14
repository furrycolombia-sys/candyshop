import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { ReceiptViewer } from "./ReceiptViewer";

describe("ReceiptViewer", () => {
  it("renders the receipt heading", () => {
    render(<ReceiptViewer transferNumber={null} receiptUrl={null} />);
    expect(screen.getByText("receipt")).toBeInTheDocument();
  });

  it("displays transfer number when provided", () => {
    render(<ReceiptViewer transferNumber="TX-12345" receiptUrl={null} />);
    expect(screen.getByTestId("receipt-transfer-number")).toHaveTextContent(
      "TX-12345",
    );
  });

  it("shows no transfer number message when null", () => {
    render(<ReceiptViewer transferNumber={null} receiptUrl={null} />);
    expect(screen.getByTestId("receipt-transfer-number")).toHaveTextContent(
      "noTransferNumber",
    );
  });

  it("shows view receipt link when receiptUrl is provided", () => {
    render(
      <ReceiptViewer
        transferNumber={null}
        receiptUrl="https://example.com/receipt.png"
      />,
    );
    const link = screen.getByTestId("receipt-view-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/receipt.png");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows no receipt message when receiptUrl is null", () => {
    render(<ReceiptViewer transferNumber={null} receiptUrl={null} />);
    expect(screen.getByTestId("receipt-none")).toHaveTextContent("noReceipt");
  });

  it("hides unsafe receipt links", () => {
    render(
      <ReceiptViewer
        transferNumber="TX-12345"
        receiptUrl="javascript:alert(1)"
      />,
    );

    expect(screen.queryByTestId("receipt-view-link")).not.toBeInTheDocument();
    expect(screen.getByTestId("receipt-none")).toBeInTheDocument();
  });

  it("has the correct test ID", () => {
    render(<ReceiptViewer transferNumber={null} receiptUrl={null} />);
    expect(screen.getByTestId("receipt-viewer")).toBeInTheDocument();
  });
});
