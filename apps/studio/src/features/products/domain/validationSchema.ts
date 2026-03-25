import { z } from "zod";

/** Merch type_details schema */
export const merchDetailsSchema = z.object({
  weight: z.string().optional().default(""),
  dimensions: z.string().optional().default(""),
  ships_from: z.string().optional().default(""),
  material: z.string().optional().default(""),
  care_instructions: z.string().optional().default(""),
});

/** Digital type_details schema */
export const digitalDetailsSchema = z.object({
  file_size: z.string().optional().default(""),
  format: z.string().optional().default(""),
  resolution: z.string().optional().default(""),
  license_type: z.string().optional().default(""),
});

/** Service type_details schema */
export const serviceDetailsSchema = z.object({
  total_slots: z.coerce.number().int().positive().optional(),
  slots_available: z.coerce.number().int().nonnegative().optional(),
  turnaround_days: z.coerce.number().int().positive().optional(),
  revisions_included: z.coerce.number().int().nonnegative().optional(),
  commercial_use: z.boolean().optional().default(false),
});

/** Ticket type_details schema */
export const ticketDetailsSchema = z.object({
  venue: z.string().optional().default(""),
  location: z.string().optional().default(""),
  doors_open: z.string().optional().default(""),
  age_restriction: z.string().optional().default(""),
  capacity: z.coerce.number().int().positive().optional(),
  tickets_remaining: z.coerce.number().int().nonnegative().optional(),
});

/** Highlight schema */
export const highlightSchema = z.object({
  icon: z.string().optional().default(""),
  title_en: z.string().min(1),
  title_es: z.string().optional().default(""),
  description_en: z.string().optional().default(""),
  description_es: z.string().optional().default(""),
});

export type Highlight = z.infer<typeof highlightSchema>;

/** FAQ item schema */
export const faqItemSchema = z.object({
  question_en: z.string().min(1),
  question_es: z.string().optional().default(""),
  answer_en: z.string().optional().default(""),
  answer_es: z.string().optional().default(""),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

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
  highlights: z.array(highlightSchema).optional().default([]),
  faq: z.array(faqItemSchema).optional().default([]),
  type_details_merch: merchDetailsSchema.optional(),
  type_details_digital: digitalDetailsSchema.optional(),
  type_details_service: serviceDetailsSchema.optional(),
  type_details_ticket: ticketDetailsSchema.optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
