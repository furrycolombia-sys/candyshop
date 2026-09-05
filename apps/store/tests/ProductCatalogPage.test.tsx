import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ProductCatalogPage } from "@/features/products/presentation/pages/ProductCatalogPage";

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

let mockParams = { category: "", type: "", q: "" };

vi.mock("nuqs", () => ({
  useQueryStates: () => [mockParams],
  parseAsString: { withDefault: () => ({}) },
}));

let mockLoading = false;
let mockError = false;
let mockData: unknown[] | undefined;

vi.mock("@/features/products/application/hooks/useStoreProducts", () => ({
  useStoreProducts: () => ({
    data: mockData,
    isLoading: mockLoading,
    isError: mockError,
  }),
}));

vi.mock("@/features/products/presentation/components/ProductFilters", () => ({
  ProductFilters: () => (
    <div>
      <div data-testid="search-bar" />
      <div data-testid="category-filter" />
      <div data-testid="type-filter" />
    </div>
  ),
}));

vi.mock("@/features/products/presentation/components/ProductGrid", () => ({
  ProductGrid: ({ products }: { products: unknown[] }) => (
    <div data-testid="product-grid">{products.length} products</div>
  ),
}));

describe("ProductCatalogPage", () => {
  beforeEach(() => {
    mockParams = { category: "", type: "", q: "" };
  });

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

  it("filters products by category", () => {
    mockLoading = false;
    mockError = false;
    mockParams = { category: "digital", type: "", q: "" };
    mockData = [
      {
        id: "p1",
        name_en: "Product 1",
        name_es: "Producto 1",
        description_en: "Desc 1",
        description_es: "Desc 1",
        category: "merch",
        type: "merch",
      },
      {
        id: "p2",
        name_en: "Product 2",
        name_es: "Producto 2",
        description_en: "Desc 2",
        description_es: "Desc 2",
        category: "digital",
        type: "digital",
      },
    ];
    render(<ProductCatalogPage />);
    // grid mock shows count of products
    expect(screen.getByTestId("product-grid")).toHaveTextContent("1 products");
  });

  it("filters products by type", () => {
    mockLoading = false;
    mockError = false;
    mockParams = { category: "", type: "service", q: "" };
    mockData = [
      {
        id: "p1",
        name_en: "Widget",
        name_es: "Widget",
        description_en: "A widget",
        description_es: "Un widget",
        category: "merch",
        type: "merch",
      },
      {
        id: "p2",
        name_en: "Consulting",
        name_es: "Consultoría",
        description_en: "A service",
        description_es: "Un servicio",
        category: "services",
        type: "service",
      },
    ];
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-grid")).toHaveTextContent("1 products");
  });

  it("filters products by search query matching name", () => {
    mockLoading = false;
    mockError = false;
    mockParams = { category: "", type: "", q: "Consulting" };
    mockData = [
      {
        id: "p1",
        name_en: "Widget",
        name_es: "Widget",
        description_en: "A widget",
        description_es: "Un widget",
        category: "merch",
        type: "merch",
      },
      {
        id: "p2",
        name_en: "Consulting",
        name_es: "Consultoría",
        description_en: "A service",
        description_es: "Un servicio",
        category: "services",
        type: "service",
      },
    ];
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-grid")).toHaveTextContent("1 products");
  });

  it("filters products by search query matching description", () => {
    mockLoading = false;
    mockError = false;
    mockParams = { category: "", type: "", q: "widget" };
    mockData = [
      {
        id: "p1",
        name_en: "Item A",
        name_es: "Item A",
        description_en: "Contains the word widget",
        description_es: "Contiene la palabra widget",
        category: "merch",
        type: "merch",
      },
      {
        id: "p2",
        name_en: "Item B",
        name_es: "Item B",
        description_en: "No match here",
        description_es: "Sin coincidencia",
        category: "digital",
        type: "digital",
      },
    ];
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-grid")).toHaveTextContent("1 products");
  });

  it("returns empty list when search query has no match", () => {
    mockLoading = false;
    mockError = false;
    mockParams = { category: "", type: "", q: "zzznomatch" };
    mockData = [
      {
        id: "p1",
        name_en: "Widget",
        name_es: "Widget",
        description_en: "A widget",
        description_es: "Un widget",
        category: "merch",
        type: "merch",
      },
    ];
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-grid")).toHaveTextContent("0 products");
  });

  it("returns empty list when products is undefined", () => {
    mockLoading = false;
    mockError = false;
    mockData = undefined;
    render(<ProductCatalogPage />);
    expect(screen.getByTestId("product-grid")).toHaveTextContent("0 products");
  });
});
