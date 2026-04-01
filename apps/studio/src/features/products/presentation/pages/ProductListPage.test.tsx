/* eslint-disable react/button-has-type */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: () => [{ type: "", category: "", q: "" }, vi.fn()],
  };
});

vi.mock("@/features/products/application/useProducts", () => ({
  useProducts: () => ({
    data: [{ id: "1", name_en: "Product 1" }],
    isLoading: false,
  }),
}));

vi.mock("@/features/products/presentation/components/ProductFilters", () => ({
  ProductFilters: () => <div data-testid="product-filters" />,
}));

vi.mock("@/features/products/presentation/components/ProductTable", () => ({
  ProductTable: () => <div data-testid="product-table" />,
}));

import { ProductListPage } from "./ProductListPage";

describe("ProductListPage", () => {
  it("renders page with title", () => {
    render(<ProductListPage />);
    expect(screen.getByTestId("products-title")).toBeInTheDocument();
  });

  it("renders product filters", () => {
    render(<ProductListPage />);
    expect(screen.getByTestId("product-filters")).toBeInTheDocument();
  });

  it("renders product table", () => {
    render(<ProductListPage />);
    expect(screen.getByTestId("product-table")).toBeInTheDocument();
  });

  it("renders add product button", () => {
    render(<ProductListPage />);
    expect(screen.getByTestId("new-product-button")).toBeInTheDocument();
  });
});
