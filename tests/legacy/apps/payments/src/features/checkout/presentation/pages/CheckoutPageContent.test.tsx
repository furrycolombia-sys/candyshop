import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" />,
  PartyPopper: () => <svg data-testid="party-popper" />,
  ShoppingBag: () => <svg data-testid="shopping-bag" />,
}));

vi.mock("auth/client", () => ({
  useCurrentUser: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { store: "https://store.example.com" },
}));

const mockUseCartFromCookie = vi.fn();
vi.mock("@/features/checkout/application/hooks/useCartFromCookie", () => ({
  useCartFromCookie: () => mockUseCartFromCookie(),
}));

const mockClearCartCookie = vi.fn();
vi.mock("@/features/checkout/application/hooks/useClearCartCookie", () => ({
  useClearCartCookie: () => mockClearCartCookie,
}));

const mockMutateAsync = vi.fn();
vi.mock("@/features/checkout/application/hooks/useSubmitPayment", () => ({
  useSubmitPayment: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock(
  "@/features/checkout/presentation/components/SellerCheckoutCard",
  () => ({
    SellerCheckoutCard: ({
      sellerId,
      onSubmit,
      error,
    }: {
      sellerId: string;
      onSubmit: (params: {
        paymentMethodId: string;
        buyerSubmission: Record<string, string>;
        receiptFile: File | null;
        transferNumber: string | null;
      }) => void;
      error: string | null;
    }) => (
      <button
        type="button"
        data-testid={`checkout-card-${sellerId}`}
        data-error={error ?? ""}
        onClick={() =>
          onSubmit({
            paymentMethodId: "pm-1",
            buyerSubmission: {},
            receiptFile: null,
            transferNumber: null,
          })
        }
      />
    ),
  }),
);

import { CheckoutPageContent } from "./CheckoutPageContent";

const singleSellerCart = {
  groups: [
    {
      sellerId: "s1",
      sellerName: "Seller One",
      items: [],
      subtotal: 100,
      currency: "USD",
    },
  ],
  isEmpty: false,
  isLoading: false,
  getItemName: vi.fn(),
};

describe("CheckoutPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders loading skeletons when cart is loading", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [],
      isEmpty: false,
      isLoading: true,
      getItemName: vi.fn(),
    });

    render(<CheckoutPageContent />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders empty cart state when cart is empty", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [],
      isEmpty: true,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPageContent />);

    expect(screen.getByTestId("checkout-empty")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-go-to-store")).toBeInTheDocument();
  });

  it("renders checkout page with seller cards when cart has items", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [
        {
          sellerId: "s1",
          sellerName: "Seller One",
          items: [],
          subtotal: 100,
          currency: "USD",
        },
        {
          sellerId: "s2",
          sellerName: "Seller Two",
          items: [],
          subtotal: 200,
          currency: "USD",
        },
      ],
      isEmpty: false,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPageContent />);

    expect(screen.getByTestId("checkout-page")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-card-s1")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-card-s2")).toBeInTheDocument();
  });

  it("renders back-to-store link on the main checkout page", () => {
    mockUseCartFromCookie.mockReturnValue({
      groups: [
        {
          sellerId: "s1",
          sellerName: "Seller One",
          items: [],
          subtotal: 100,
          currency: "USD",
        },
      ],
      isEmpty: false,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPageContent />);

    expect(screen.getByTestId("checkout-back-to-store")).toBeInTheDocument();
  });

  it("renders completed checkout state when session flag is set", () => {
    sessionStorage.setItem("libra-checkout-completed", "1");

    mockUseCartFromCookie.mockReturnValue({
      groups: [
        {
          sellerId: "s1",
          sellerName: "Seller One",
          items: [],
          subtotal: 100,
          currency: "USD",
        },
      ],
      isEmpty: false,
      isLoading: false,
      getItemName: vi.fn(),
    });

    render(<CheckoutPageContent />);

    expect(screen.getByTestId("checkout-all-submitted")).toBeInTheDocument();
    expect(screen.getByTestId("party-popper")).toBeInTheDocument();
  });

  it("shows completion state and clears cart after successful submission", async () => {
    mockMutateAsync.mockResolvedValue("order-1");
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-all-submitted")).toBeInTheDocument();
      expect(mockClearCartCookie).toHaveBeenCalled();
    });
  });

  it("shows Error.message when mutateAsync throws an Error instance", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network failure"));
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "network failure",
      );
    });
  });

  it("formats code and message when thrown object has both fields", async () => {
    mockMutateAsync.mockRejectedValue({ code: "ERR_CODE", message: "details" });
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "ERR_CODE: details",
      );
    });
  });

  it("shows message when thrown object has only a string message field", async () => {
    mockMutateAsync.mockRejectedValue({ message: "only message" });
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "only message",
      );
    });
  });

  it("shows code when thrown object has only a string code field", async () => {
    mockMutateAsync.mockRejectedValue({ code: "ERR_ONLY" });
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "ERR_ONLY",
      );
    });
  });

  it("falls back to String(error) when object has no string message or code", async () => {
    mockMutateAsync.mockRejectedValue({ foo: "bar" });
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "[object Object]",
      );
    });
  });

  it("converts null error to unknown_error fallback", async () => {
    mockMutateAsync.mockRejectedValue(null);
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      // null → extractErrorMessage returns "" → handleSubmit falls back to "unknown_error"
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "unknown_error",
      );
    });
  });

  it("converts plain string error to its string value", async () => {
    mockMutateAsync.mockRejectedValue("string_error");
    mockUseCartFromCookie.mockReturnValue(singleSellerCart);

    render(<CheckoutPageContent />);
    fireEvent.click(screen.getByTestId("checkout-card-s1"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-card-s1")).toHaveAttribute(
        "data-error",
        "string_error",
      );
    });
  });
});
