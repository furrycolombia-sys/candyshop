import { SECTION_TYPES } from "shared/types";
import { z } from "zod";

/** Translator function for validation messages */
type ValidationT = (key: string) => string;

/** Create section item schema with translated messages */
function createSectionItemSchema(t: ValidationT) {
  return z
    .object({
      title_en: z.string().default(""),
      title_es: z.string().default(""),
      description_en: z.string().default(""),
      description_es: z.string().default(""),
      icon: z.string().optional().default(""),
      image_url: z.string().optional().default(""),
      sort_order: z.number().default(0),
    })
    .refine((item) => item.title_en.trim() || item.title_es.trim(), {
      message: t("itemTitleRequired"),
      path: ["title_en"],
    });
}

/** Create section schema with translated messages */
function createSectionSchema(t: ValidationT) {
  const sectionItemSchema = createSectionItemSchema(t);

  return z
    .object({
      name_en: z.string().default(""),
      name_es: z.string().default(""),
      type: z.enum(SECTION_TYPES).default("cards"),
      sort_order: z.number().default(0),
      items: z.array(sectionItemSchema).default([]),
    })
    .refine((section) => section.name_en.trim() || section.name_es.trim(), {
      message: t("sectionNameRequired"),
      path: ["name_en"],
    })
    .refine((section) => section.items.length > 0, {
      message: t("sectionItemsRequired"),
      path: ["items"],
    });
}

/** Section item type (matches the Zod schema shape without needing runtime schema) */
export interface SectionItem {
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  icon: string;
  image_url: string;
  sort_order: number;
}

export type Section = {
  name_en: string;
  name_es: string;
  type: (typeof SECTION_TYPES)[number];
  sort_order: number;
  items: SectionItem[];
};

/** Product image schema */
export const productImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional().default(""),
  sort_order: z.number().int().nonnegative(),
  is_cover: z.boolean().optional().default(false),
});

export type ProductImage = z.infer<typeof productImageSchema>;

/**
 * Create the product form schema with translated validation messages.
 *
 * Usage:
 * ```ts
 * const t = useTranslations("form.validation");
 * const schema = createProductFormSchema(t);
 * ```
 */
export function createProductFormSchema(t: ValidationT) {
  const sectionSchema = createSectionSchema(t);

  return z.object({
    name_en: z.string().min(1, t("required")),
    name_es: z.string().optional().default(""),
    description_en: z.string().optional().default(""),
    description_es: z.string().optional().default(""),
    tagline_en: z.string().optional().default(""),
    tagline_es: z.string().optional().default(""),
    long_description_en: z.string().optional().default(""),
    long_description_es: z.string().optional().default(""),
    type: z.enum(["merch", "digital", "service", "ticket"]),
    category: z.enum([
      "fursuits",
      "merch",
      "art",
      "events",
      "digital",
      "deals",
    ]),
    price_cop: z.coerce.number().int().positive(t("positiveNumber")),
    price_usd: z.coerce.number().int().positive().optional().or(z.literal("")),
    compare_at_price_cop: z.coerce
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional()
      .default(null),
    compare_at_price_usd: z.coerce
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional()
      .default(null),
    tags: z.string().optional().default(""),
    featured: z.boolean().optional().default(false),
    is_active: z.boolean().optional().default(true),
    images: z.array(productImageSchema).optional().default([]),
    sections: z.array(sectionSchema).optional().default([]),
    max_quantity: z.number().int().nonnegative().nullable().default(null),
    refundable: z.boolean().nullable().default(null),
  });
}

/** Static schema for type inference only (no translated messages) */
export const productFormSchema = createProductFormSchema((key) => key);

export type ProductFormValues = z.infer<typeof productFormSchema>;
