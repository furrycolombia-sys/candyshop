import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("lucide-react", () => ({
  Users: () => <svg data-testid="users-icon" />,
}));

vi.mock("./delegates/AsSellerRow", () => ({
  AsSellerRow: ({ row }: { row: { id: string } }) => (
    <div data-testid={`seller-row-${row.id}`} />
  ),
}));

vi.mock("./delegates/AsDelegateRow", () => ({
  AsDelegateRow: ({ row }: { row: { id: string } }) => (
    <div data-testid={`delegate-row-${row.id}`} />
  ),
}));

const mockUseUserDelegates = vi.fn();

vi.mock("@/features/users/application/hooks/useUserDelegates", () => ({
  useUserDelegates: (...args: unknown[]) => mockUseUserDelegates(...args),
}));

import { UserDelegatesCard } from "./UserDelegatesCard";

describe("UserDelegatesCard", () => {
  it("renders the card container", () => {
    mockUseUserDelegates.mockReturnValue({ data: null, isLoading: false });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByTestId("user-delegates-card")).toBeInTheDocument();
  });

  it("shows loading text while isLoading is true", () => {
    mockUseUserDelegates.mockReturnValue({ data: null, isLoading: true });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByText("t:loading")).toBeInTheDocument();
  });

  it("shows empty text when loaded with no delegates", () => {
    mockUseUserDelegates.mockReturnValue({
      data: { asSeller: [], asDelegate: [] },
      isLoading: false,
    });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByText("t:empty")).toBeInTheDocument();
  });

  it("does not show loading or empty when loading", () => {
    mockUseUserDelegates.mockReturnValue({ data: null, isLoading: true });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.queryByText("t:empty")).toBeNull();
  });

  it("renders asSeller rows", () => {
    mockUseUserDelegates.mockReturnValue({
      data: {
        asSeller: [{ id: "s1" }, { id: "s2" }],
        asDelegate: [],
      },
      isLoading: false,
    });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByTestId("seller-row-s1")).toBeInTheDocument();
    expect(screen.getByTestId("seller-row-s2")).toBeInTheDocument();
    expect(screen.getByText("t:asSeller")).toBeInTheDocument();
  });

  it("renders asDelegate rows", () => {
    mockUseUserDelegates.mockReturnValue({
      data: {
        asSeller: [],
        asDelegate: [{ id: "d1" }],
      },
      isLoading: false,
    });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByTestId("delegate-row-d1")).toBeInTheDocument();
    expect(screen.getByText("t:asDelegate")).toBeInTheDocument();
  });

  it("renders both seller and delegate sections when both have data", () => {
    mockUseUserDelegates.mockReturnValue({
      data: {
        asSeller: [{ id: "s1" }],
        asDelegate: [{ id: "d1" }],
      },
      isLoading: false,
    });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.getByTestId("seller-row-s1")).toBeInTheDocument();
    expect(screen.getByTestId("delegate-row-d1")).toBeInTheDocument();
    expect(screen.queryByText("t:empty")).toBeNull();
  });

  it("does not show asSeller section when asSeller is empty", () => {
    mockUseUserDelegates.mockReturnValue({
      data: { asSeller: [], asDelegate: [{ id: "d1" }] },
      isLoading: false,
    });
    render(<UserDelegatesCard userId="u1" canDelete={false} />);
    expect(screen.queryByText("t:asSeller")).toBeNull();
  });

  it("passes userId to useUserDelegates", () => {
    mockUseUserDelegates.mockReturnValue({ data: null, isLoading: false });
    render(<UserDelegatesCard userId="specific-user" canDelete={false} />);
    expect(mockUseUserDelegates).toHaveBeenCalledWith("specific-user");
  });
});
