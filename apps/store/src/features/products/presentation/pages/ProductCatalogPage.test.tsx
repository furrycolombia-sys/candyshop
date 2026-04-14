import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProductCatalogPage } from "./ProductCatalogPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock("nuqs", () => ({
  useQueryStates: () => [{ category: "", type: "", q: "" }],
  parseAsString: { withDefault: () => ({}) },
}));

let mockLoading = false;
let mockError = false;
let mockData: unknown[] | undefined;

vi.mock("@/features/products/application/useStoreProducts", () => ({
  useStoreProducts: () => ({
    data: mockData,
    isLoading: mockLoading,
    isError: mockError,
  }),
}));

vi.mock("../components/CategoryFilter", () => ({
  CategoryFilter: () => <div data-testid="category-filter" />,
}));

vi.mock("../components/ProductGrid", () => ({
  ProductGrid: ({ products }: { products: unknown[] }) => (
    <div data-testid="product-grid">{products.length} products</div>
  ),
}));

vi.mock("../components/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock("../components/TypeFilter", () => ({
  TypeFilter: () => <div data-testid="type-filter" />,
}));

describe("ProductCatalogPage", () => {
  it("renders loading state", () => {
    mockLoading = true;
    mockError = false;
    mockData = undefined;
    render(<ProductCatalogPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockLoading = false;
    mockError = true;
    mockData = undefined;
    render(<ProductCatalogPage />);
    expect(screen.getByText("loadError")).toBeInTheDocument();
  });

  it("renders product catalog with data", () => {
    mockLoading = false;
    mockError = false;
    mockData = [
      {
        id: "p1",
        name_en: "Product 1",
        name_es: "Producto 1",
        description_en: "Desc",
        description_es: "Desc",
        category: "merch",
        type: "merch",
      },
    ];
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-catalog-title")).toBeInTheDocument();
    expect(screen.getByTestId("product-grid")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("category-filter")).toBeInTheDocument();
  });
});
