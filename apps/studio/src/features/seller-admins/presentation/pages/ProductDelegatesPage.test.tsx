import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn(() => true);
const mockMutate = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: mockHasPermission,
  }),
}));

vi.mock("@/features/auth/application/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({ user: { id: "seller-1" } }),
}));

vi.mock("@/features/products/application/useProductForm", () => ({
  useProductById: () => ({
    data: { id: "product-1", name_en: "Test Product" },
    isLoading: false,
  }),
}));

vi.mock("@/features/seller-admins/application/hooks/useDelegates", () => ({
  useDelegates: () => ({ data: [], isLoading: false }),
}));

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegateMutations",
  () => ({
    useAddDelegate: () => ({ mutate: mockMutate, isPending: false }),
    useRemoveDelegate: () => ({ mutate: vi.fn(), isPending: false }),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/DelegateList",
  () => ({
    DelegateList: () => <div data-testid="delegate-list" />,
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/AddDelegateForm",
  () => ({
    AddDelegateForm: ({
      productId,
    }: {
      productId?: string;
      onAdd: () => void;
    }) => <div data-testid="add-delegate-form" data-product-id={productId} />,
  }),
);

import { ProductDelegatesPage } from "./ProductDelegatesPage";

describe("ProductDelegatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("renders the page with product name in header", () => {
    render(<ProductDelegatesPage productId="product-1" />);
    expect(screen.getByTestId("product-delegates-page")).toBeInTheDocument();
    expect(screen.getByText(/Test Product/)).toBeInTheDocument();
  });

  it("renders delegate list and add form", () => {
    render(<ProductDelegatesPage productId="product-1" />);
    expect(screen.getByTestId("delegate-list")).toBeInTheDocument();
    expect(screen.getByTestId("add-delegate-form")).toBeInTheDocument();
  });

  it("passes productId to AddDelegateForm", () => {
    render(<ProductDelegatesPage productId="product-1" />);
    const form = screen.getByTestId("add-delegate-form");
    expect(form).toHaveAttribute("data-product-id", "product-1");
  });

  it("shows access denied when missing permission", () => {
    mockHasPermission.mockReturnValue(false);
    render(<ProductDelegatesPage productId="product-1" />);
    expect(
      screen.queryByTestId("product-delegates-page"),
    ).not.toBeInTheDocument();
  });
});
