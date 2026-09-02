import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Input: ({
    placeholder,
    ...rest
  }: {
    placeholder?: string;
    "data-testid"?: string;
    [key: string]: unknown;
  }) => <input placeholder={placeholder} data-testid={rest["data-testid"]} />,
}));

import { ProfileForm } from "./ProfileForm";

import type { UserProfile } from "@/features/account/domain/types";

const mockProfile: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  avatar_url: null,
  provider: "google",
  display_name: "Test User",
  display_email: "display@example.com",
  display_avatar_url: "https://example.com/avatar.png",
  first_seen_at: "2024-01-01T00:00:00Z",
  last_seen_at: "2025-01-01T00:00:00Z",
};

describe("ProfileForm", () => {
  const defaultProps = {
    profile: mockProfile,
    onSubmit: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  };

  it("renders the form", () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  });

  it("renders display name, email, and avatar fields", () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByTestId("profile-display-name")).toBeInTheDocument();
    expect(screen.getByTestId("profile-display-email")).toBeInTheDocument();
    expect(screen.getByTestId("profile-display-avatar")).toBeInTheDocument();
  });

  it("renders the public profile heading", () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByText("publicProfile")).toBeInTheDocument();
  });

  it("shows success message when isSuccess", () => {
    render(<ProfileForm {...defaultProps} isSuccess={true} />);
    expect(screen.getByText("saved")).toBeInTheDocument();
  });

  it("shows error message when isError", () => {
    render(<ProfileForm {...defaultProps} isError={true} />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows saving text when isPending", () => {
    render(<ProfileForm {...defaultProps} isPending={true} />);
    expect(screen.getByText("saving")).toBeInTheDocument();
  });

  it("disables submit button when isPending", () => {
    render(<ProfileForm {...defaultProps} isPending={true} />);
    const saveBtn = screen.getByTestId("profile-save");
    expect(saveBtn).toBeDisabled();
  });

  it("renders save text when not pending", () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });
});
