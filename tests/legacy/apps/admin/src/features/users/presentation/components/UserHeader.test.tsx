import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `t:${key}:${JSON.stringify(params)}` : `t:${key}`,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("shared/config/environment", () => ({
  getRuntimeEnv: () => ({ authHostUrl: "http://auth.test" }),
}));

vi.mock("ui", () => ({
  Avatar: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="avatar-image" />
  ),
  AvatarFallback: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("./RoleBadge", () => ({
  RoleBadge: ({ role }: { role: string }) => (
    <span data-testid="role-badge">{role}</span>
  ),
}));

vi.mock("@/features/users/application/utils", () => ({
  computeRole: (keys: string[]) =>
    keys.includes("audit.read") ? "admin" : "buyer",
  formatLastSeen: (ts: string | null) =>
    ts ? { key: "minutesAgo", params: { count: 5 } } : null,
  getInitials: (name: string | null, email: string) =>
    name ? name[0]!.toUpperCase() : email[0]!.toUpperCase(),
}));

import { UserHeader } from "./UserHeader";

import type { UserProfileSummary } from "@/features/users/domain/types";

const baseUser: UserProfileSummary = {
  id: "user-1",
  email: "user@example.com",
  display_name: "Test User",
  display_avatar_url: "https://example.com/avatar.png",
  avatar_url: null,
  last_seen_at: "2024-01-01T10:00:00Z",
};

describe("UserHeader", () => {
  it("renders the user-header container", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByTestId("user-header")).toBeInTheDocument();
  });

  it("shows display_name when present", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("falls back to email when display_name is null", () => {
    const user = { ...baseUser, display_name: null };
    render(<UserHeader user={user} grantedKeys={[]} />);
    expect(screen.getAllByText("user@example.com").length).toBeGreaterThan(0);
  });

  it("renders the email", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is present", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
  });

  it("does not render avatar image when no avatarUrl", () => {
    const user = { ...baseUser, display_avatar_url: null, avatar_url: null };
    render(<UserHeader user={user} grantedKeys={[]} />);
    expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
  });

  it("prefers display_avatar_url over avatar_url", () => {
    const user = {
      ...baseUser,
      display_avatar_url: "https://example.com/display.png",
      avatar_url: "https://example.com/fallback.png",
    };
    render(<UserHeader user={user} grantedKeys={[]} />);
    const img = screen.getByTestId("avatar-image") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/display.png");
  });

  it("uses avatar_url when display_avatar_url is null", () => {
    const user = {
      ...baseUser,
      display_avatar_url: null,
      avatar_url: "https://example.com/fallback.png",
    };
    render(<UserHeader user={user} grantedKeys={[]} />);
    const img = screen.getByTestId("avatar-image") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/fallback.png");
  });

  it("renders the role badge", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByTestId("role-badge")).toBeInTheDocument();
  });

  it("shows computed last seen when last_seen_at is present", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    expect(screen.getByText(/t:minutesAgo/)).toBeInTheDocument();
  });

  it("shows em dash when last_seen_at is null", () => {
    const user = { ...baseUser, last_seen_at: null };
    render(<UserHeader user={user} grantedKeys={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders view profile link with correct href", () => {
    render(<UserHeader user={baseUser} grantedKeys={[]} />);
    const link = screen.getByTestId("user-view-profile-link");
    expect(link).toHaveAttribute("href", "http://auth.test/en/profile/user-1");
  });
});
