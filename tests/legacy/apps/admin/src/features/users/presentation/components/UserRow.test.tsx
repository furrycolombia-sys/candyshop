import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/features/users/presentation/components/RoleBadge", () => ({
  RoleBadge: ({ role }: { role: string }) => (
    <span data-testid="role-badge">{role}</span>
  ),
}));

vi.mock("@/features/users/application/utils", () => ({
  formatLastSeen: vi.fn(() => null),
  getInitials: vi.fn(() => "AB"),
}));

import { UserRow } from "./UserRow";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  display_name: "Test User",
  last_seen_at: null,
  display_avatar_url: null,
  avatar_url: null,
};

const defaultProps = {
  user: mockUser,
  role: "buyer" as const,
  onClick: vi.fn(),
  isSelected: false,
  onSelectToggle: vi.fn(),
};

describe("UserRow", () => {
  it("renders user email", () => {
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("calls onClick with userId when row is clicked", () => {
    const onClick = vi.fn();
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} onClick={onClick} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId("user-row-user-1"));
    expect(onClick).toHaveBeenCalledWith("user-1");
  });

  it("checkbox click does not propagate to row onClick", () => {
    const onClick = vi.fn();
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} onClick={onClick} />
        </tbody>
      </table>,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onSelectToggle when checkbox is clicked", () => {
    const onSelectToggle = vi.fn();
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} onSelectToggle={onSelectToggle} />
        </tbody>
      </table>,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onSelectToggle).toHaveBeenCalledTimes(1);
  });

  it("checkbox reflects isSelected prop", () => {
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} isSelected={true} />
        </tbody>
      </table>,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders AvatarImage when display_avatar_url is set", () => {
    const userWithAvatar = {
      ...mockUser,
      display_avatar_url: "https://example.com/avatar.png",
    };
    render(
      <table>
        <tbody>
          <UserRow {...defaultProps} user={userWithAvatar} />
        </tbody>
      </table>,
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
