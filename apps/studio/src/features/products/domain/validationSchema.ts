import { z } from "zod";

/** Section item schema */
export const sectionItemSchema = z.object({
  title_en: z.string().default(""),
  title_es: z.string().default(""),
  description_en: z.string().default(""),
  description_es: z.string().default(""),
  icon: z.string().optional().default(""),
  image_url: z.string().optional().default(""),
  sort_order: z.number().default(0),
});

export type SectionItem = z.infer<typeof sectionItemSchema>;

/** Section schema */
export const sectionSchema = z.object({
  // eslint-disable-next-line i18next/no-literal-string -- validation message, not user-facing
  name_en: z.string().min(1, "Section name required"),
  name_es: z.string().default(""),
  type: z
    .enum(["cards", "accordion", "two-column", "gallery"])
    .default("cards"),
  sort_order: z.number().default(0),
  items: z.array(sectionItemSchema).default([]),
});

export type Section = z.infer<typeof sectionSchema>;

/** Product image schema */
export const productImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional().default(""),
  sort_order: z.number().int().nonnegative(),
});

export type ProductImage = z.infer<typeof productImageSchema>;

/** Product form validation schema */
export const productFormSchema = z.object({
  name_en: z.string().min(1),
  name_es: z.string().optional().default(""),
  description_en: z.string().optional().default(""),
  description_es: z.string().optional().default(""),
  tagline_en: z.string().optional().default(""),
  tagline_es: z.string().optional().default(""),
  long_description_en: z.string().optional().default(""),
  long_description_es: z.string().optional().default(""),
  type: z.enum(["merch", "digital", "service", "ticket"]),
  category: z.enum(["fursuits", "merch", "art", "events", "digital", "deals"]),
  price_cop: z.coerce.number().int().positive(),
  price_usd: z.coerce.number().int().positive().optional().or(z.literal("")),
  tags: z.string().optional().default(""),
  featured: z.boolean().optional().default(false),
  images: z.array(productImageSchema).optional().default([]),
  sections: z.array(sectionSchema).optional().default([]),
  max_quantity: z.number().int().nonnegative().nullable().default(null),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
