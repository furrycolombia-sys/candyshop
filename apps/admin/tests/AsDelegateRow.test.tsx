import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/features/users/application/hooks/useUserDelegates", () => ({
  useRemoveUserDelegate: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { AsDelegateRow } from "@/features/users/presentation/components/delegates/AsDelegateRow";

import type { DelegateAsDelegate } from "@/features/users/application/hooks/useUserDelegates";

const baseRow: DelegateAsDelegate = {
  id: "row-1",
  seller_id: "seller-1",
  admin_user_id: "admin-1",
  product_id: "prod-1",
  permissions: ["products.create"],
  created_at: "2024-01-01",
  seller_profile: {
    id: "seller-1",
    email: "seller@example.com",
    display_name: "Seller Name",
    avatar_url: null,
  },
  product: { id: "prod-1", name_en: "Widget", name_es: "Artilugio" },
};

describe("AsDelegateRow", () => {
  it("renders the row container with correct test-id", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={false} />);
    expect(
      screen.getByTestId("delegate-as-delegate-row-1"),
    ).toBeInTheDocument();
  });

  it("shows the delegatedBy label", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={false} />);
    expect(screen.getByText("t:delegatedBy")).toBeInTheDocument();
  });

  it("shows the seller display_name when present", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={false} />);
    expect(screen.getByText("Seller Name")).toBeInTheDocument();
  });

  it("falls back to seller email when display_name is null", () => {
    const row: DelegateAsDelegate = {
      ...baseRow,
      seller_profile: { ...baseRow.seller_profile, display_name: null },
    };
    render(<AsDelegateRow row={row} userId="u1" canDelete={false} />);
    expect(screen.getByText("seller@example.com")).toBeInTheDocument();
  });

  it("renders the product name", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={false} />);
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });

  it("does not render remove button when canDelete is false", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={false} />);
    expect(
      screen.queryByTestId("remove-delegate-row-1"),
    ).not.toBeInTheDocument();
  });

  it("renders remove button when canDelete is true", () => {
    render(<AsDelegateRow row={baseRow} userId="u1" canDelete={true} />);
    expect(screen.getByTestId("remove-delegate-row-1")).toBeInTheDocument();
  });
});
