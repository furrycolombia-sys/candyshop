import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockPaymentSettings = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("@/features/settings/application/hooks/usePaymentSettings", () => ({
  usePaymentSettings: () => mockPaymentSettings(),
}));

vi.mock("@/features/settings/application/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

let capturedOnSave: ((v: unknown) => void) | null = null;

vi.mock("@/features/settings/presentation/components/TimeoutSettings", () => ({
  TimeoutSettings: ({ onSave }: { onSave: (v: unknown) => void }) => {
    capturedOnSave = onSave;
    return <div data-testid="timeout-settings-mock">TimeoutSettings</div>;
  },
}));

import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and subtitle", () => {
    mockPaymentSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<SettingsPage />);

    expect(screen.getByTestId("settings-title")).toHaveTextContent("title");
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockPaymentSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<SettingsPage />);
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockPaymentSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<SettingsPage />);
    expect(screen.getByTestId("settings-error")).toBeInTheDocument();
  });

  it("renders TimeoutSettings when data is loaded", () => {
    mockPaymentSettings.mockReturnValue({
      data: {
        timeout_awaiting_payment_hours: 48,
        timeout_pending_verification_hours: 72,
        timeout_evidence_requested_hours: 24,
      },
      isLoading: false,
      isError: false,
    });

    render(<SettingsPage />);
    expect(screen.getByTestId("timeout-settings-mock")).toBeInTheDocument();
  });

  it("handleSave calls updateMutation for changed keys", () => {
    mockPaymentSettings.mockReturnValue({
      data: {
        timeout_awaiting_payment_hours: 48,
        timeout_pending_verification_hours: 72,
        timeout_evidence_requested_hours: 24,
      },
      isLoading: false,
      isError: false,
    });
    render(<SettingsPage />);
    capturedOnSave!({
      timeout_awaiting_payment_hours: 96,
      timeout_pending_verification_hours: 72,
      timeout_evidence_requested_hours: 24,
    });
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      key: "timeout_awaiting_payment_hours",
      value: "96",
    });
  });

  it("does not show loading or error when data is available", () => {
    mockPaymentSettings.mockReturnValue({
      data: {
        timeout_awaiting_payment_hours: 48,
        timeout_pending_verification_hours: 72,
        timeout_evidence_requested_hours: 24,
      },
      isLoading: false,
      isError: false,
    });

    render(<SettingsPage />);
    expect(screen.queryByTestId("settings-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-error")).not.toBeInTheDocument();
  });
});
