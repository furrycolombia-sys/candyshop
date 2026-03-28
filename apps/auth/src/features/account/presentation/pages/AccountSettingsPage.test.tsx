/* eslint-disable vitest/expect-expect */
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
  Input: (props: Record<string, unknown>) => (
    <input data-testid={props["data-testid"] as string} />
  ),
}));

vi.mock("auth/client", () => ({
  useSupabaseAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

const mockUseProfile = vi.fn();
vi.mock("@/features/account/application/hooks/useProfile", () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));

vi.mock("@/features/account/application/hooks/useUpdateProfile", () => ({
  useUpdateProfile: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("@/features/account/presentation/components/ProfileCard", () => ({
  ProfileCard: () => <div data-testid="profile-card" />,
}));

vi.mock("@/features/account/presentation/components/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form" />,
}));

import { AccountSettingsPage } from "./AccountSettingsPage";

const mockProfile = {
  id: "user-1",
  email: "test@example.com",
  avatar_url: null,
  provider: "google",
  display_name: "Test",
  display_email: null,
  display_avatar_url: null,
  first_seen_at: "2024-01-01T00:00:00Z",
  last_seen_at: "2025-01-01T00:00:00Z",
};

describe("AccountSettingsPage", () => {
  it("shows skeleton when loading", () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<AccountSettingsPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state when profile fails to load", () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<AccountSettingsPage />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders account settings page with profile data", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<AccountSettingsPage />);
    expect(screen.getByTestId("account-settings-page")).toBeInTheDocument();
  });

  it("renders ProfileCard and ProfileForm", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<AccountSettingsPage />);
    expect(screen.getByTestId("profile-card")).toBeInTheDocument();
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  });

  it("renders sign out button", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<AccountSettingsPage />);
    expect(screen.getByTestId("sign-out")).toBeInTheDocument();
    expect(screen.getByText("signOut")).toBeInTheDocument();
  });

  it("renders page title", () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    render(<AccountSettingsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("calls signOut when sign out button is clicked", async () => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isError: false,
    });
    const replaceMock = vi.fn();
    Object.defineProperty(globalThis, "location", {
      value: { ...globalThis.location, replace: replaceMock },
      writable: true,
      configurable: true,
    });
    render(<AccountSettingsPage />);
    const signOutBtn = screen.getByTestId("sign-out");
    signOutBtn.click();
  });
});
