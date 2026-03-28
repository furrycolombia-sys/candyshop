import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { TimeoutSettings } from "./TimeoutSettings";

import type { PaymentSettings } from "@/features/settings/domain/types";

const defaultSettings: PaymentSettings = {
  timeout_awaiting_payment_hours: 48,
  timeout_pending_verification_hours: 72,
  timeout_evidence_requested_hours: 24,
};

describe("TimeoutSettings", () => {
  const defaultProps = {
    settings: defaultSettings,
    onSave: vi.fn(),
    isPending: false,
  };

  it("renders the card with test id", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(screen.getByTestId("timeout-settings-card")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(screen.getByText("timeouts.title")).toBeInTheDocument();
  });

  it("renders input fields for each timeout", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(
      screen.getByTestId("timeout-input-timeout_awaiting_payment_hours"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("timeout-input-timeout_pending_verification_hours"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("timeout-input-timeout_evidence_requested_hours"),
    ).toBeInTheDocument();
  });

  it("displays current settings values", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(
      screen.getByTestId("timeout-input-timeout_awaiting_payment_hours"),
    ).toHaveValue(48);
    expect(
      screen.getByTestId("timeout-input-timeout_pending_verification_hours"),
    ).toHaveValue(72);
    expect(
      screen.getByTestId("timeout-input-timeout_evidence_requested_hours"),
    ).toHaveValue(24);
  });

  it("calls onSave with updated values when save is clicked", () => {
    const onSave = vi.fn();
    render(<TimeoutSettings {...defaultProps} onSave={onSave} />);

    fireEvent.change(
      screen.getByTestId("timeout-input-timeout_awaiting_payment_hours"),
      { target: { value: "36" } },
    );

    fireEvent.click(screen.getByTestId("timeout-settings-save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout_awaiting_payment_hours: 36,
      }),
    );
  });

  it("shows saving text when isPending", () => {
    render(<TimeoutSettings {...defaultProps} isPending={true} />);
    expect(screen.getByTestId("timeout-settings-save")).toHaveTextContent(
      "saving",
    );
  });

  it("disables save button when isPending", () => {
    render(<TimeoutSettings {...defaultProps} isPending={true} />);
    expect(screen.getByTestId("timeout-settings-save")).toBeDisabled();
  });

  it("shows save text when not pending", () => {
    render(<TimeoutSettings {...defaultProps} isPending={false} />);
    expect(screen.getByTestId("timeout-settings-save")).toHaveTextContent(
      "save",
    );
  });

  it("renders labels for each field", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(screen.getByText("timeouts.awaitingPayment")).toBeInTheDocument();
    expect(
      screen.getByText("timeouts.pendingVerification"),
    ).toBeInTheDocument();
    expect(screen.getByText("timeouts.evidenceRequested")).toBeInTheDocument();
  });

  it("renders hints for each field", () => {
    render(<TimeoutSettings {...defaultProps} />);
    expect(
      screen.getByText("timeouts.awaitingPaymentHint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("timeouts.pendingVerificationHint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("timeouts.evidenceRequestedHint"),
    ).toBeInTheDocument();
  });
});
