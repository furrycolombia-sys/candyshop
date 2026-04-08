import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CheckoutPage } from "./CheckoutPage";

import type { SellerGroup } from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { store: "http://localhost:5001/store" },
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: () => true,
  }),
  useSupabaseAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockSubmitPayment = {
  mutateAsync: vi.fn(),
};
vi.mock("@/features/checkout/application/hooks/useSubmitPayment", () => ({
  useSubmitPayment: () => mockSubmitPayment,
}));

vi.mock("@/features/checkout/infrastructure/cartCookie", () => ({
  clearCartCookie: vi.fn(),
}));

const mockUseCartFromCookie = vi.fn();
vi.mock("@/features/checkout/application/hooks/useCartFromCookie", () => ({
  useCartFromCookie: () => mockUseCartFromCookie(),
}));

vi.mock(
  "@/features/checkout/presentation/components/SellerCheckoutCard",
  () => ({
    SellerCheckoutCard: ({ sellerId }: { sellerId: string }) => (
      <div data-testid={`seller-checkout-${sellerId}`}>Card</div>
    ),
  }),
);

describe("CheckoutPage", () => {
  it("renders loading state with skeletons", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [],
      isEmpty: false,
      isLoading: true,
      getItemName: vi.fn(),
    });

    render(<CheckoutPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders empty cart state", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [],
      isEmpty: true,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPage />);
    expect(screen.getByTestId("checkout-empty")).toBeInTheDocument();
    expect(screen.getByText("emptyCart")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-go-to-store")).toBeInTheDocument();
  });

  it("renders seller checkout cards for groups", () => {
    const groups: SellerGroup[] = [
      {
        sellerId: "s1",
        sellerName: "Seller 1",
        items: [],
        subtotalCop: 10_000,
      },
      {
        sellerId: "s2",
        sellerName: "Seller 2",
        items: [],
        subtotalCop: 5000,
      },
    ];

    mockUseCartFromCookie.mockReturnValue({
      groups,
      isEmpty: false,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPage />);
    expect(screen.getByTestId("checkout-page")).toBeInTheDocument();
    expect(screen.getByTestId("seller-checkout-s1")).toBeInTheDocument();
    expect(screen.getByTestId("seller-checkout-s2")).toBeInTheDocument();
  });

  it("renders checkout title and back link", () => {
    const groups: SellerGroup[] = [
      {
        sellerId: "s1",
        sellerName: "Seller 1",
        items: [],
        subtotalCop: 10_000,
      },
    ];

    mockUseCartFromCookie.mockReturnValue({
      groups,
      isEmpty: false,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPage />);
    expect(screen.getByTestId("checkout-title")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-back-to-store")).toBeInTheDocument();
  });
});
