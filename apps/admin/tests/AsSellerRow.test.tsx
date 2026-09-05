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

import { AsSellerRow } from "@/features/users/presentation/components/delegates/AsSellerRow";

import type { DelegateAsSeller } from "@/features/users/application/hooks/useUserDelegates";

const baseRow: DelegateAsSeller = {
  id: "row-2",
  seller_id: "seller-2",
  admin_user_id: "admin-2",
  product_id: "prod-2",
  permissions: ["orders.read"],
  created_at: "2024-01-01",
  admin_profile: {
    id: "admin-2",
    email: "admin@example.com",
    display_name: "Admin User",
    avatar_url: null,
  },
  product: { id: "prod-2", name_en: "Gadget", name_es: "Aparato" },
};

describe("AsSellerRow", () => {
  it("renders the row container with correct test-id", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={false} />);
    expect(screen.getByTestId("delegate-as-seller-row-2")).toBeInTheDocument();
  });

  it("shows admin display_name when present", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={false} />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("also shows email when display_name is set", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={false} />);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("shows email as primary when display_name is null", () => {
    const row: DelegateAsSeller = {
      ...baseRow,
      admin_profile: { ...baseRow.admin_profile, display_name: null },
    };
    render(<AsSellerRow row={row} userId="u2" canDelete={false} />);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("does not show a second email when display_name is null", () => {
    const row: DelegateAsSeller = {
      ...baseRow,
      admin_profile: { ...baseRow.admin_profile, display_name: null },
    };
    render(<AsSellerRow row={row} userId="u2" canDelete={false} />);
    // Email appears only once (as primary text, not secondary)
    expect(screen.getAllByText("admin@example.com")).toHaveLength(1);
  });

  it("renders the product name", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={false} />);
    expect(screen.getByText("Gadget")).toBeInTheDocument();
  });

  it("does not render remove button when canDelete is false", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={false} />);
    expect(
      screen.queryByTestId("remove-delegate-row-2"),
    ).not.toBeInTheDocument();
  });

  it("renders remove button when canDelete is true", () => {
    render(<AsSellerRow row={baseRow} userId="u2" canDelete={true} />);
    expect(screen.getByTestId("remove-delegate-row-2")).toBeInTheDocument();
  });
});
