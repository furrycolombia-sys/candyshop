/* eslint-disable @next/next/no-img-element -- test mock, not rendering real images */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AvatarImage: (props: any) => <img alt="" {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { DelegateList } from "./DelegateList";

import type { DelegateWithProfile } from "@/features/seller-admins/domain/types";

const mockDelegate: DelegateWithProfile = {
  id: "del-1",
  seller_id: "seller-1",
  admin_user_id: "admin-1",
  product_id: "product-1",
  permissions: ["orders.approve"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  admin_profile: {
    id: "admin-1",
    email: "delegate@example.com",
    display_name: "Delegate User",
    avatar_url: null,
  },
};

describe("DelegateList", () => {
  it("renders empty state when no delegates", () => {
    render(<DelegateList delegates={[]} onRemove={vi.fn()} />);
    expect(screen.getByTestId("delegate-list")).toBeInTheDocument();
    expect(screen.getByText("noDelegates")).toBeInTheDocument();
  });

  it("renders delegate items with correct test IDs", () => {
    render(<DelegateList delegates={[mockDelegate]} onRemove={vi.fn()} />);
    expect(screen.getByTestId("delegate-item-admin-1")).toBeInTheDocument();
    expect(screen.getByText("Delegate User")).toBeInTheDocument();
    expect(screen.getByText("delegate@example.com")).toBeInTheDocument();
  });

  it("renders remove button with correct test ID", () => {
    render(<DelegateList delegates={[mockDelegate]} onRemove={vi.fn()} />);
    expect(screen.getByTestId("delegate-remove-admin-1")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<DelegateList delegates={[mockDelegate]} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId("delegate-remove-admin-1"));
    expect(onRemove).toHaveBeenCalledWith("admin-1");
  });

  it("renders permission badges", () => {
    render(<DelegateList delegates={[mockDelegate]} onRemove={vi.fn()} />);
    expect(screen.getByText("permissions.orders_approve")).toBeInTheDocument();
  });
});
