/* eslint-disable testing-library/no-node-access */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

const mockUseProfile = vi.fn();

vi.mock("@/features/account/application/hooks/useProfile", () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));

import { UserProfilePage } from "./UserProfilePage";

import type { UserProfile } from "@/features/account/domain/types";

const mockProfile: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  avatar_url: "https://example.com/avatar.png",
  provider: "google",
  display_name: "Display Name",
  display_email: "display@example.com",
  display_avatar_url: "https://example.com/display-avatar.png",
  first_seen_at: "2024-06-15T10:00:00Z",
  last_seen_at: "2025-01-01T10:00:00Z",
};

describe("UserProfilePage", () => {
  it("shows skeletons when loading", () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows not found state on error", () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByTestId("profile-not-found")).toBeInTheDocument();
    expect(screen.getByText("notFound")).toBeInTheDocument();
  });

  it("shows not found when profile is null", () => {
    mockUseProfile.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByTestId("profile-not-found")).toBeInTheDocument();
  });

  it("renders the profile page with user data", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByTestId("user-profile-page")).toBeInTheDocument();
  });

  it("displays the display_name", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByText("Display Name")).toBeInTheDocument();
  });

  it("displays display_email as contact email", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByTestId("profile-contact")).toHaveTextContent(
      "display@example.com",
    );
  });

  it("falls back to email username when display_name is null", () => {
    mockUseProfile.mockReturnValue({
      data: { ...mockProfile, display_name: null },
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("uses display_avatar_url when available", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    const { container } = render(<UserProfilePage userId="user-1" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(
      "https://example.com/display-avatar.png",
    );
  });

  it("shows initials placeholder when no avatar", () => {
    mockUseProfile.mockReturnValue({
      data: {
        ...mockProfile,
        avatar_url: null,
        display_avatar_url: null,
      },
      isLoading: false,
      isError: false,
    });
    const { container } = render(<UserProfilePage userId="user-1" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("D")).toBeInTheDocument(); // First char of "Display Name"
  });

  it("shows provider when available", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByText("google")).toBeInTheDocument();
  });

  it("falls back to email when display_email is null", () => {
    mockUseProfile.mockReturnValue({
      data: { ...mockProfile, display_email: null },
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-1" />);
    expect(screen.getByTestId("profile-contact")).toHaveTextContent(
      "test@example.com",
    );
  });

  it("passes userId to useProfile hook", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<UserProfilePage userId="user-42" />);
    expect(mockUseProfile).toHaveBeenCalledWith("user-42");
  });
});
