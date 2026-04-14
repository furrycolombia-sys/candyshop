/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/infrastructure/i18n", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: "a",
}));

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: () => ({}),
}));

vi.mock("@/features/products/infrastructure/productMutations", () => ({
  fetchProductById: vi.fn(),
  insertProduct: vi.fn(),
  updateProduct: vi.fn(),
}));

import {
  productToFormValues,
  useProductById,
  useInsertProduct,
  useUpdateProduct,
} from "./useProductForm";

import {
  fetchProductById,
  insertProduct,
  updateProduct,
} from "@/features/products/infrastructure/productMutations";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// Minimal mock product matching the Product type shape
const mockProduct = {
  id: "prod-1",
  name_en: "Test Product",
  name_es: "Producto de Prueba",
  description_en: "A description",
  description_es: "Una descripcion",
  tagline_en: "tagline en",
  tagline_es: "tagline es",
  long_description_en: "long desc en",
  long_description_es: "long desc es",
  type: "merch" as const,
  category: "merch" as const,
  price_cop: 50_000,
  price_usd: 12,
  tags: ["tag1", "tag2"],
  featured: true,
  is_active: true,
  images: [
    { url: "https://example.com/img.png", alt: "alt text", sort_order: 0 },
  ],
  sections: [
    {
      name_en: "Section",
      name_es: "Seccion",
      type: "cards",
      sort_order: 0,
      items: [],
    },
  ],
  max_quantity: 10,
  compare_at_price_cop: 60_000,
  compare_at_price_usd: 15,
  refundable: true,
  slug: "test-product",
  sort_order: 1,
  seller_id: "seller-1",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("productToFormValues", () => {
  it("converts a product to form values", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock product
    const result = productToFormValues(mockProduct as any);

    expect(result.name_en).toBe("Test Product");
    expect(result.name_es).toBe("Producto de Prueba");
    expect(result.type).toBe("merch");
    expect(result.category).toBe("merch");
    expect(result.price_cop).toBe(50_000);
    expect(result.price_usd).toBe(12);
    expect(result.featured).toBe(true);
    expect(result.is_active).toBe(true);
    expect(result.max_quantity).toBe(10);
    expect(result.compare_at_price_cop).toBe(60_000);
    expect(result.compare_at_price_usd).toBe(15);
    expect(result.refundable).toBe(true);
  });

  it("joins tags with comma separator", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(mockProduct as any);
    expect(result.tags).toBe("tag1, tag2");
  });

  it("converts images to form format", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(mockProduct as any);
    expect(result.images).toEqual([
      { url: "https://example.com/img.png", alt: "alt text", sort_order: 0 },
    ]);
  });

  it("handles null images", () => {
    const product = { ...mockProduct, images: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(product as any);
    expect(result.images).toEqual([]);
  });

  it("handles null sections", () => {
    const product = { ...mockProduct, sections: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(product as any);
    expect(result.sections).toEqual([]);
  });

  it("handles null tags", () => {
    const product = { ...mockProduct, tags: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(product as any);
    expect(result.tags).toBe("");
  });

  it("handles falsy price_usd", () => {
    const product = { ...mockProduct, price_usd: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(product as any);
    expect(result.price_usd).toBe("");
  });

  it("handles null nullable fields with defaults", () => {
    const product = {
      ...mockProduct,
      max_quantity: null,
      compare_at_price_cop: null,
      compare_at_price_usd: null,
      refundable: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = productToFormValues(product as any);
    expect(result.max_quantity).toBeNull();
    expect(result.compare_at_price_cop).toBeNull();
    expect(result.compare_at_price_usd).toBeNull();
    expect(result.refundable).toBeNull();
  });
});

describe("useProductById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns product data on success", async () => {
    const mock = {
      id: "p1",
      name_en: "Product",
      name_es: "Producto",
      description_en: "",
      description_es: "",
      tagline_en: "",
      tagline_es: "",
      long_description_en: "",
      long_description_es: "",
      type: "merch" as const,
      category: "merch" as const,
      price_cop: 10_000,
      price_usd: 0,
      compare_at_price_cop: null,
      compare_at_price_usd: null,
      max_quantity: null,
      is_active: true,
      featured: false,
      slug: "product",
      sort_order: 0,
      images: [],
      sections: [],
      tags: [],
      rating: null,
      review_count: 0,
      refundable: null,
      seller_id: null,
      event_id: null,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchProductById).mockResolvedValue(mock as any);

    const { result } = renderHook(() => useProductById("p1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mock);
  });

  it("does not fetch when id is undefined", () => {
    renderHook(() => useProductById(), {
      wrapper: createWrapper(),
    });
    expect(fetchProductById).not.toHaveBeenCalled();
  });
});

describe("useInsertProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls insertProduct on mutate", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(insertProduct).mockResolvedValue({ id: "new-1" } as any);

    const { result } = renderHook(() => useInsertProduct(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        name_en: "New",
        name_es: "Nuevo",
        description_en: "",
        description_es: "",
        tagline_en: "",
        tagline_es: "",
        long_description_en: "",
        long_description_es: "",
        type: "merch",
        category: "merch",
        price_cop: 10_000,
        price_usd: "",
        tags: "",
        featured: false,
        is_active: true,
        images: [],
        sections: [],
        max_quantity: null,
        compare_at_price_cop: null,
        compare_at_price_usd: null,
        // discount_percent is not in ProductFormValues
        refundable: null,
      }),
    );

    expect(insertProduct).toHaveBeenCalled();
  });
});

describe("useUpdateProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateProduct on mutate", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(updateProduct).mockResolvedValue({ id: "p1" } as any);

    const { result } = renderHook(() => useUpdateProduct("p1"), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.mutateAsync({
        name_en: "Updated",
        name_es: "Actualizado",
        description_en: "",
        description_es: "",
        tagline_en: "",
        tagline_es: "",
        long_description_en: "",
        long_description_es: "",
        type: "merch",
        category: "merch",
        price_cop: 20_000,
        price_usd: "",
        tags: "",
        featured: false,
        is_active: true,
        images: [],
        sections: [],
        max_quantity: null,
        compare_at_price_cop: null,
        compare_at_price_usd: null,
        // discount_percent is not in ProductFormValues
        refundable: null,
      }),
    );

    expect(updateProduct).toHaveBeenCalled();
  });
});
