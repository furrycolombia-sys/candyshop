import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: (permission: string | string[]) => {
      const granted = new Set(["products.create", "products.update"]);
      return Array.isArray(permission)
        ? permission.every((key) => granted.has(key))
        : granted.has(permission);
    },
  }),
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

const mockInsert = { mutate: vi.fn(), isPending: false, error: null };
const mockUpdate = { mutate: vi.fn(), isPending: false, error: null };
const mockUseProductById = vi.fn();

vi.mock("@/features/products/application/hooks/useProductForm", () => ({
  productToFormValues: vi.fn((p: unknown) => p),
  useInsertProduct: () => mockInsert,
  useProductById: (...args: unknown[]) => mockUseProductById(...args),
  useUpdateProduct: () => mockUpdate,
}));

vi.mock("@/features/products/presentation/components/inline-editor", () => ({
  InlineEditor: ({ isEdit }: { isEdit: boolean }) => (
    <div data-testid="inline-editor">{isEdit ? "edit" : "create"}</div>
  ),
}));

import { ProductFormPage } from "./ProductFormPage";

describe("ProductFormPage", () => {
  it("renders editor in create mode when no productId", () => {
    mockUseProductById.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    render(<ProductFormPage />);
    expect(screen.getByTestId("inline-editor")).toHaveTextContent("create");
  });

  it("shows skeleton when loading in edit mode", () => {
    mockUseProductById.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<ProductFormPage productId="p1" />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders editor in edit mode when product is loaded", () => {
    mockUseProductById.mockReturnValue({
      data: { id: "p1", name_en: "Product" },
      isLoading: false,
    });
    render(<ProductFormPage productId="p1" />);
    expect(screen.getByTestId("inline-editor")).toHaveTextContent("edit");
  });
});
