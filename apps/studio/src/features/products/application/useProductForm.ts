import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import type { Json } from "api/types/database";
import { useMemo } from "react";

import type { Product } from "@/features/products/domain/types";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import {
  fetchProductById,
  insertProduct,
  updateProduct,
} from "@/features/products/infrastructure/productMutations";
import { useRouter } from "@/shared/infrastructure/i18n";

const PRODUCTS_QUERY_KEY = "products";

/** Generate a URL-safe slug from the product name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

/** Build type_details JSONB from form values based on selected type */
function buildTypeDetails(values: ProductFormValues): Json {
  switch (values.type) {
    case "merch": {
      return (values.type_details_merch ?? {}) as Json;
    }
    case "digital": {
      return (values.type_details_digital ?? {}) as Json;
    }
    case "service": {
      return (values.type_details_service ?? {}) as Json;
    }
    case "ticket": {
      return (values.type_details_ticket ?? {}) as Json;
    }
    default: {
      return {};
    }
  }
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
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
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
  const typeDetails = (product.type_details ?? {}) as Record<string, unknown>;

  const rawImages = product.images as
    | Array<{ url: string; alt?: string; sort_order?: number }>
    | null
    | undefined;
  const images = (rawImages ?? []).map((img, idx) => ({
    url: img.url ?? "",
    alt: img.alt ?? "",
    sort_order: img.sort_order ?? idx,
  }));

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
    images,
    type_details_merch:
      product.type === "merch"
        ? (typeDetails as ProductFormValues["type_details_merch"])
        : undefined,
    type_details_digital:
      product.type === "digital"
        ? (typeDetails as ProductFormValues["type_details_digital"])
        : undefined,
    type_details_service:
      product.type === "service"
        ? (typeDetails as ProductFormValues["type_details_service"])
        : undefined,
    type_details_ticket:
      product.type === "ticket"
        ? (typeDetails as ProductFormValues["type_details_ticket"])
        : undefined,
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
        images: (values.images ?? []) as Json,
        type_details: buildTypeDetails(values),
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
      updateProduct(supabase, productId, {
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
        images: (values.images ?? []) as Json,
        type_details: buildTypeDetails(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      router.push("/");
    },
  });
}
