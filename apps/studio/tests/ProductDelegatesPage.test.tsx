import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn(() => true);
const mockAddMutate = vi.fn();
const mockRemoveMutate = vi.fn();
const mockUseProductById = vi.fn(() => ({
  data: { id: "product-1", name_en: "Test Product" } as
    | { id: string; name_en: string | null }
    | undefined,
  isLoading: false,
}));
const mockUseDelegates = vi.fn(() => ({ data: [], isLoading: false }));
const mockUseCurrentUser = vi.fn(() => ({
  user: { id: "seller-1" } as { id: string } | null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    hasPermission: mockHasPermission,
  }),
}));

vi.mock("@/shared/application/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/features/products/application/hooks/useProductForm", () => ({
  useProductById: () => mockUseProductById(),
}));

vi.mock("@/features/seller-admins/application/hooks/useDelegates", () => ({
  useDelegates: () => mockUseDelegates(),
}));

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegateMutations",
  () => ({
    useAddDelegate: () => ({ mutate: mockAddMutate, isPending: false }),
    useRemoveDelegate: () => ({ mutate: mockRemoveMutate, isPending: false }),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/DelegateList",
  () => ({
    DelegateList: ({
      onRemove,
    }: {
      onRemove: (adminUserId: string) => void;
    }) => (
      <div data-testid="delegate-list">
        <button
          type="button"
          data-testid="trigger-remove"
          onClick={() => onRemove("user-abc")}
        >
          Remove
        </button>
      </div>
    ),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/AddDelegateForm",
  () => ({
    AddDelegateForm: ({
      productId,
      onAdd,
    }: {
      productId?: string;
      onAdd: (adminUserId: string, permissions: string[]) => void;
    }) => (
      <div data-testid="add-delegate-form" data-product-id={productId}>
        <button
          type="button"
          data-testid="trigger-add"
          onClick={() => onAdd("new-user", ["read"])}
        >
          Add
        </button>
      </div>
    ),
  }),
);

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: () => <div data-testid="access-denied" />,
}));

import { ProductDelegatesPage } from "@/features/seller-admins/presentation/pages/ProductDelegatesPage";

describe("ProductDelegatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockUseProductById.mockReturnValue({
      data: { id: "product-1", name_en: "Test Product" },
      isLoading: false,
    });
    mockUseDelegates.mockReturnValue({ data: [], isLoading: false });
    mockUseCurrentUser.mockReturnValue({ user: { id: "seller-1" } });
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
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("returns null when delegates are loading", () => {
    mockUseDelegates.mockReturnValue({ data: [], isLoading: true });
    const { container } = render(<ProductDelegatesPage productId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when product is loading", () => {
    mockUseProductById.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ProductDelegatesPage productId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("handles null product name gracefully", () => {
    mockUseProductById.mockReturnValue({
      data: { id: "p1", name_en: null },
      isLoading: false,
    });
    render(<ProductDelegatesPage productId="p1" />);
    expect(screen.getByTestId("product-delegates-page")).toBeInTheDocument();
  });

  it("handleAdd calls addMutation.mutate with sellerId and productId", () => {
    render(<ProductDelegatesPage productId="product-1" />);
    fireEvent.click(screen.getByTestId("trigger-add"));
    expect(mockAddMutate).toHaveBeenCalledWith({
      sellerId: "seller-1",
      adminUserId: "new-user",
      permissions: ["read"],
      productId: "product-1",
    });
  });

  it("handleAdd does nothing when sellerId is undefined", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    render(<ProductDelegatesPage productId="product-1" />);
    fireEvent.click(screen.getByTestId("trigger-add"));
    expect(mockAddMutate).not.toHaveBeenCalled();
  });

  it("handleRemove calls removeMutation.mutate with sellerId and productId", () => {
    render(<ProductDelegatesPage productId="product-1" />);
    fireEvent.click(screen.getByTestId("trigger-remove"));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      sellerId: "seller-1",
      adminUserId: "user-abc",
      productId: "product-1",
    });
  });

  it("handleRemove does nothing when sellerId is undefined", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    render(<ProductDelegatesPage productId="product-1" />);
    fireEvent.click(screen.getByTestId("trigger-remove"));
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });
});
