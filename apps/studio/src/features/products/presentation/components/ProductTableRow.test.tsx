import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`],
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="product-image" />
  ),
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
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockToggle = { mutate: vi.fn() };
const mockDelete = { mutate: vi.fn() };

vi.mock("@/features/products/application/useProductMutations", () => ({
  useToggleProduct: () => mockToggle,
  useDeleteProduct: () => mockDelete,
}));

import { ProductTableRow } from "./ProductTableRow";

const mockProduct = {
  id: "p1",
  name_en: "Test Product",
  name_es: "Producto de Prueba",
  type: "merch" as const,
  category: "merch" as const,
  price_cop: 50_000,
  is_active: true,
  featured: false,
  sort_order: 1,
  images: ["https://example.com/img.jpg"],
  quantity_available: 10,
  quantity_sold: 2,
  discount_percent: null,
};

const defaultProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: mockProduct as any,
  isOddRow: false,
  canReorder: false,
  dragProvided: {
    innerRef: () => null,
    draggableProps: {},
    dragHandleProps: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  isDragging: false,
};

describe("ProductTableRow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders product name", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("renders product image", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("product-image")).toBeInTheDocument();
  });

  it("renders price", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    // Price should be formatted as COP
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders type and category badges", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    // Category or type text present
    expect(screen.getByText("categories.merch")).toBeInTheDocument();
  });

  it("renders active toggle", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("toggle-active-p1")).toBeInTheDocument();
  });

  it("toggles active state when switch is clicked", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId("toggle-active-p1"));
    expect(mockToggle.mutate).toHaveBeenCalledWith({
      id: "p1",
      field: "is_active",
      value: false,
    });
  });

  it("shows confirm button after clicking delete, then deletes on confirm", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    // First click opens confirm mode
    fireEvent.click(screen.getByTestId("delete-product-p1"));
    // Second click confirms
    fireEvent.click(screen.getByTestId("confirm-delete-p1"));
    expect(mockDelete.mutate).toHaveBeenCalled();
  });

  it("cancels delete when cancel button is clicked", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId("delete-product-p1"));
    fireEvent.click(screen.getByTestId("cancel-delete-p1"));
    // Should be back to normal state
    expect(screen.getByTestId("delete-product-p1")).toBeInTheDocument();
  });

  it("renders drag handle when canReorder is true", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow
            {...defaultProps}
            canReorder={true}
            dragProvided={
              {
                innerRef: () => null,
                draggableProps: {},
                dragHandleProps: {},
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any
            }
          />
        </tbody>
      </table>,
    );
    expect(screen.getByLabelText("products.dragToReorder")).toBeInTheDocument();
  });

  it("applies dragging styles when isDragging", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} isDragging={true} />
        </tbody>
      </table>,
    );
    const row = screen.getByTestId("product-row-p1");
    expect(row.className).toContain("shadow");
  });

  it("toggles featured state", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow {...defaultProps} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId("toggle-featured-p1"));
    expect(mockToggle.mutate).toHaveBeenCalledWith({
      id: "p1",
      field: "featured",
      value: true,
    });
  });

  it("renders without image when images is empty", () => {
    render(
      <table>
        <tbody>
          <ProductTableRow
            {...defaultProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            product={{ ...mockProduct, images: [] } as any}
          />
        </tbody>
      </table>,
    );
    expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
  });
});
