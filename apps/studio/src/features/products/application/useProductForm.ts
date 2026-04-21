import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import type { Json } from "api/supabase/types";
import { useMemo } from "react";

import { PRODUCTS_QUERY_KEY } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import {
  fetchProductById,
  insertProduct,
  updateProduct,
} from "@/features/products/infrastructure/productMutations";
import { useRouter } from "@/shared/infrastructure/i18n";

/** Generate a URL-safe slug from the product name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

/** Parse tags from comma-separated string */
function parseTags(tagsString: string): string[] {
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Fetch product by ID for edit form */
export function useProductById(productId?: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, productId],
    queryFn: () => {
      if (!productId) throw new Error("Product ID is required");
      return fetchProductById(supabase, productId);
    },
    enabled: !!productId,
  });
}

/** Convert a Product row to form values for editing */
export function productToFormValues(product: Product): ProductFormValues {
  const rawImages = product.images as
    | Array<{
        url: string;
        alt?: string;
        sort_order?: number;
        is_cover?: boolean;
        is_store_cover?: boolean;
        fit?: "cover" | "contain";
      }>
    | null
    | undefined;
  const images = (rawImages ?? []).map((img, idx) => ({
    url: img.url ?? "",
    alt: img.alt ?? "",
    sort_order: img.sort_order ?? idx,
    is_cover: img.is_cover ?? false,
    is_store_cover: img.is_store_cover ?? false,
    fit: img.fit ?? ("cover" as const),
  }));

  const rawSections = product.sections as
    | ProductFormValues["sections"]
    | null
    | undefined;

  return {
    name_en: product.name_en,
    name_es: product.name_es,
    description_en: product.description_en,
    description_es: product.description_es,
    tagline_en: product.tagline_en,
    tagline_es: product.tagline_es,
    long_description_en: product.long_description_en,
    long_description_es: product.long_description_es,
    type: product.type,
    category: product.category,
    price_cop: product.price_cop,
    price_usd: product.price_usd || "",
    tags: product.tags?.join(", ") ?? "",
    featured: product.featured,
    is_active: product.is_active,
    images,
    sections: rawSections ?? [],
    max_quantity: product.max_quantity ?? null,
    compare_at_price_cop: product.compare_at_price_cop ?? null,
    compare_at_price_usd: product.compare_at_price_usd ?? null,
    refundable: product.refundable ?? null,
  };
}

/** Build the shared payload fields from form values */
function buildProductPayload(values: ProductFormValues) {
  return {
    name_en: values.name_en,
    name_es: values.name_es || values.name_en,
    description_en: values.description_en,
    description_es: values.description_es,
    tagline_en: values.tagline_en,
    tagline_es: values.tagline_es,
    long_description_en: values.long_description_en,
    long_description_es: values.long_description_es,
    type: values.type,
    category: values.category,
    price_cop: values.price_cop,
    price_usd: typeof values.price_usd === "number" ? values.price_usd : 0,
    tags: parseTags(values.tags ?? ""),
    featured: values.featured ?? false,
    is_active: values.is_active ?? true,
    images: (values.images ?? []) as Json,
    sections: (values.sections ?? []) as Json,
    max_quantity: values.max_quantity ?? null,
    compare_at_price_cop: values.compare_at_price_cop ?? null,
    compare_at_price_usd: values.compare_at_price_usd ?? null,
    refundable: values.refundable ?? null,
  };
}

/** Mutation for creating a new product */
export function useInsertProduct() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (values: ProductFormValues) => {
      const slug = generateSlug(values.name_en);
      return insertProduct(supabase, {
        ...buildProductPayload(values),
        slug,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      router.push("/");
    },
  });
}

/** Mutation for updating an existing product */
export function useUpdateProduct(productId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (values: ProductFormValues) =>
      updateProduct(supabase, productId, buildProductPayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      router.push("/");
    },
  });
}
