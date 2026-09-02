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

import { ProfileCard } from "./ProfileCard";

import type { UserProfile } from "@/features/account/domain/types";

const mockProfile: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  avatar_url: "https://example.com/avatar.png",
  provider: "google",
  display_name: "Test User",
  display_email: null,
  display_avatar_url: null,
  first_seen_at: "2024-06-15T10:00:00Z",
  last_seen_at: "2025-01-01T10:00:00Z",
};

describe("ProfileCard", () => {
  it("renders the profile card", () => {
    render(<ProfileCard profile={mockProfile} />);
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
  });

  it("displays the email", () => {
    render(<ProfileCard profile={mockProfile} />);
    expect(screen.getByTestId("profile-email")).toHaveTextContent(
      "test@example.com",
    );
  });

  it("displays the provider", () => {
    render(<ProfileCard profile={mockProfile} />);
    expect(screen.getByTestId("profile-provider")).toHaveTextContent("google");
  });

  it("renders avatar when avatar_url is present", () => {
    const { container } = render(<ProfileCard profile={mockProfile} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/avatar.png");
  });

  it("does not render avatar when avatar_url is null", () => {
    const profileNoAvatar = { ...mockProfile, avatar_url: null };
    const { container } = render(<ProfileCard profile={profileNoAvatar} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("displays emailProvider translation when provider is null", () => {
    const profileNoProvider = { ...mockProfile, provider: null };
    render(<ProfileCard profile={profileNoProvider} />);
    expect(screen.getByTestId("profile-provider")).toHaveTextContent(
      "emailProvider",
    );
  });

  it("displays the auth info heading", () => {
    render(<ProfileCard profile={mockProfile} />);
    expect(screen.getByText("authInfo")).toBeInTheDocument();
  });

  it("displays member since date", () => {
    render(<ProfileCard profile={mockProfile} />);
    expect(screen.getByText("memberSince")).toBeInTheDocument();
  });
});
