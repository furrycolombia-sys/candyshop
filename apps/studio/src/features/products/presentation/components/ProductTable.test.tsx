import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
  };
});

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Droppable: ({
    children,
  }: {
    children: (provided: {
      innerRef: () => null;
      droppableProps: Record<string, unknown>;
      placeholder: null;
    }) => React.ReactNode;
  }) =>
    children({
      innerRef: () => null,
      droppableProps: {},
      placeholder: null,
    }),
  Draggable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: () => null;
        draggableProps: Record<string, unknown>;
        dragHandleProps: Record<string, unknown>;
      },
      snapshot: { isDragging: boolean },
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => null,
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false },
    ),
}));

vi.mock("@/features/products/application/useProductMutations", () => ({
  useReorderProducts: () => ({ mutate: vi.fn() }),
}));

vi.mock("./ProductTableRow", () => ({
  ProductTableRow: ({ product }: { product: { name_en: string } }) => (
    <tr data-testid={`product-row-${product.name_en}`}>
      <td>{product.name_en}</td>
    </tr>
  ),
}));

import { ProductTable } from "./ProductTable";

const mockProducts = [
  {
    id: "p1",
    name_en: "Product 1",
    name_es: "Producto 1",
    type: "merch",
    category: "merch",
    price_cop: 10_000,
    is_active: true,
    featured: false,
    sort_order: 1,
  },
  {
    id: "p2",
    name_en: "Product 2",
    name_es: "Producto 2",
    type: "digital",
    category: "art",
    price_cop: 20_000,
    is_active: false,
    featured: true,
    sort_order: 2,
  },
];

describe("ProductTable", () => {
  it("shows loading text when isLoading is true", () => {
    render(<ProductTable products={[]} isLoading={true} isFiltered={false} />);
    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("shows empty state when products is empty and not loading", () => {
    render(<ProductTable products={[]} isLoading={false} isFiltered={false} />);
    expect(screen.getByTestId("products-empty-state")).toBeInTheDocument();
    expect(screen.getByText("products.noProducts")).toBeInTheDocument();
  });

  it("renders a table with products", () => {
    render(
      <ProductTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products={mockProducts as any}
        isLoading={false}
        isFiltered={false}
      />,
    );
    expect(screen.getByTestId("product-table")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(
      <ProductTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products={mockProducts as any}
        isLoading={false}
        isFiltered={false}
      />,
    );
    expect(screen.getByText("products.name")).toBeInTheDocument();
    expect(screen.getByText("products.type")).toBeInTheDocument();
    expect(screen.getByText("products.category")).toBeInTheDocument();
    expect(screen.getByText("products.price")).toBeInTheDocument();
  });

  it("renders product rows", () => {
    render(
      <ProductTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products={mockProducts as any}
        isLoading={false}
        isFiltered={false}
      />,
    );
    expect(screen.getByTestId("product-row-Product 1")).toBeInTheDocument();
    expect(screen.getByTestId("product-row-Product 2")).toBeInTheDocument();
  });
});
