import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SellerCard } from "./SellerCard";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseSellerInfo = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  appUrls: { auth: "https://auth.example.com" },
}));

vi.mock("@/features/products/application/hooks/useSellerInfo", () => ({
  useSellerInfo: (sellerId: string | null) => mockUseSellerInfo(sellerId),
}));

vi.mock("ui", () => ({
  Avatar: ({ children, ...props }: React.PropsWithChildren<object>) => (
    <div data-testid="avatar" {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock, not production code
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: React.PropsWithChildren<object>) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSellerInfo(
  overrides: Partial<{ displayName: string; avatarUrl: string | null }> = {},
) {
  return {
    displayName: "Jane Doe",
    avatarUrl: "https://cdn.example.com/jane.jpg",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SellerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when sellerId is null", () => {
    mockUseSellerInfo.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = render(<SellerCard sellerId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while loading", () => {
    mockUseSellerInfo.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<SellerCard sellerId="seller-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders seller card with name when data is available", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo(),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    expect(screen.getByTestId("seller-card")).toBeInTheDocument();
    expect(screen.getByTestId("seller-name")).toHaveTextContent("Jane Doe");
  });

  it("renders avatar image when avatarUrl is provided", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo({ avatarUrl: "https://cdn.example.com/jane.jpg" }),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    expect(screen.getByTestId("avatar-image")).toHaveAttribute(
      "src",
      "https://cdn.example.com/jane.jpg",
    );
  });

  it("renders initials as fallback when avatarUrl is null", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo({ displayName: "Jane Doe", avatarUrl: null }),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("J");
  });

  it("renders a link to the seller profile", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo(),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    const link = screen.getByTestId("seller-profile-link");
    expect(link).toHaveAttribute(
      "href",
      "https://auth.example.com/en/profile/seller-1",
    );
  });

  it("renders view profile label from i18n", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo(),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    expect(screen.getByTestId("seller-profile-link")).toHaveTextContent(
      "detail.viewProfile",
    );
  });

  it("renders section title from i18n", () => {
    mockUseSellerInfo.mockReturnValue({
      data: makeSellerInfo(),
      isLoading: false,
    });
    render(<SellerCard sellerId="seller-1" />);
    expect(screen.getByTestId("seller-card-title")).toHaveTextContent(
      "detail.seller",
    );
  });
});
