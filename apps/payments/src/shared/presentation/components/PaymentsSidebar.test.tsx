import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockGrantedPermissions = [
  "orders.create",
  "receipts.create",
  "orders.read",
  "seller_payment_methods.read",
  "orders.update",
  "receipts.read",
];

vi.mock("auth/client", () => ({
  matchesPermissions: (grantedKeys: string[], required: readonly string[]) =>
    required.every((key) => grantedKeys.includes(key)),
  useCurrentUserPermissions: () => ({
    grantedKeys: mockGrantedPermissions,
    isLoading: false,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/checkout",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { PaymentsMobileSidebar } from "./PaymentsMobileSidebar";
import { PaymentsSidebar } from "./PaymentsSidebar";

describe("PaymentsSidebar", () => {
  it("renders buyer section with checkout and purchases links", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByTestId("sidebar-checkout")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-myPurchases")).toBeInTheDocument();
  });

  it("renders seller section with payment methods and sales links", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByTestId("sidebar-paymentMethods")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-sales")).toBeInTheDocument();
  });

  it("highlights the active route", () => {
    render(<PaymentsSidebar />);
    const checkoutLink = screen.getByTestId("sidebar-checkout");
    expect(checkoutLink).toHaveAttribute("aria-current", "page");
  });

  it("toggles collapsed state when collapse button is clicked", () => {
    render(<PaymentsSidebar />);
    const toggle = screen.getByTestId("sidebar-collapse-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("payments-sidebar")).toBeInTheDocument();
  });

  it("renders section group labels", () => {
    render(<PaymentsSidebar />);
    expect(screen.getByText("buyer")).toBeInTheDocument();
    expect(screen.getByText("seller")).toBeInTheDocument();
  });

  it("renders a mobile trigger", () => {
    render(<PaymentsMobileSidebar />);
    expect(
      screen.getByTestId("payments-mobile-sidebar-trigger"),
    ).toBeInTheDocument();
  });
});
